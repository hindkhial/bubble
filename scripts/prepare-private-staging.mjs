import {mkdirSync,writeFileSync,realpathSync,chmodSync} from 'node:fs';
import {dirname,basename,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';

export function preparePrivateStaging(destination) {
  if(!destination || !isAbsolute(destination)) throw new Error('Pass a NEW absolute directory outside the repository; its parent must exist.');
  const folder=join(realpathSync(dirname(destination)),basename(destination));
  const repo=realpathSync(fileURLToPath(new URL('../',import.meta.url)));
  const location=relative(repo,folder);
  if(!(location==='..' || location.startsWith('..'+sep) || isAbsolute(location))) throw new Error('Secrets must be outside the repository.');
  // No recursive creation: refuse to overwrite any existing setup or user data.
  mkdirSync(folder,{mode:0o700});
  const write=(name,value,mode=0o600)=>writeFileSync(join(folder,name),value,{flag:'wx',mode});
  const run=(command,args,input)=>{
    const result=spawnSync(command,args,{input,encoding:'utf8'});
    if(result.status!==0) throw new Error('Private setup failed; inspect the new directory and verify OpenSSL/htpasswd are installed. No existing configuration was overwritten.');
    return result.stdout;
  };
  write('ca.cnf','[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=Bubble private staging CA\n[ext]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n');
  run('openssl',['req','-x509','-newkey','rsa:3072','-nodes','-sha256','-days','7','-config',join(folder,'ca.cnf'),'-keyout',join(folder,'ca.key'),'-out',join(folder,'ca.crt')]);
  run('openssl',['req','-newkey','rsa:2048','-nodes','-sha256','-subj','/CN=localhost','-keyout',join(folder,'localhost.key'),'-out',join(folder,'localhost.csr')]);
  write('leaf.cnf','basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n');
  run('openssl',['x509','-req','-in',join(folder,'localhost.csr'),'-CA',join(folder,'ca.crt'),'-CAkey',join(folder,'ca.key'),'-CAcreateserial','-out',join(folder,'localhost.crt'),'-days','7','-sha256','-extfile',join(folder,'leaf.cnf')]);
  chmodSync(join(folder,'ca.key'),0o600);
  for(const name of ['postgres-password','app-password']) write(name,randomBytes(32).toString('hex')+'\n',0o444);
  const tester={username:'tester',password:randomBytes(32).toString('hex')};
  const hash=run('htpasswd',['-niBC','12',tester.username],tester.password+'\n');
  if(!hash.startsWith('tester:$2')) throw new Error('A bcrypt-capable htpasswd is required.');
  write('testers.htpasswd',hash,0o444);
  write('tester-credentials.json',JSON.stringify(tester)+'\n');
  for(const name of ['ca.crt','localhost.crt','localhost.key']) chmodSync(join(folder,name),0o444);
  const tag='private-'+randomBytes(6).toString('hex');
  write('staging.env',`RELEASE_TAG=${tag}\nDB_IMAGE_TAG=17-${tag}\nSTAGING_ORIGIN=https://localhost:8443\nPOSTGRES_PASSWORD_FILE=${folder}/postgres-password\nDB_PASSWORD_FILE=${folder}/app-password\nTLS_CERT_FILE=${folder}/localhost.crt\nTLS_KEY_FILE=${folder}/localhost.key\nTESTER_PASSWORD_FILE=${folder}/testers.htpasswd\n`);
  return folder;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {console.log('Private setup created: '+preparePrivateStaging(process.argv[2]));}
  catch(error) {console.error(error.message);process.exitCode=1;}
}
