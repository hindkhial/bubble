import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {statSync,realpathSync} from 'node:fs';
import {dirname} from 'node:path';
import {networkInterfaces} from 'node:os';
import {createConnection} from 'node:net';

const run=(command,args)=>{
  const result=spawnSync(command,args,{encoding:'utf8'});
  if(result.status!==0) throw new Error('Private staging verification command failed: '+command+' '+args[0]);
  return result.stdout.trim();
};
const compose=args=>run('sh',['deploy/staging/compose.sh',...args]);
const config=JSON.parse(compose(['config','--format','json']));
assert.equal(config.networks.private.internal,true);
for(const secret of Object.values(config.secrets)) {
  const file=realpathSync(secret.file);const info=statSync(file);
  assert.ok(info.isFile() && (info.mode&0o022)===0,'Secret file must not be group/world writable.');
  assert.equal(statSync(dirname(file)).mode&0o077,0,'Secret parent must be owner-only.');
}
const results=[];
for(const service of ['backend','web','db']) {
  const id=compose(['ps','-q',service]);assert.ok(id);
  const [container]=JSON.parse(run('docker',['inspect',id]));
  assert.equal(container.State.Health.Status,'healthy',service+' health');
  const uid=Number(run('docker',['exec',id,'cat','/proc/1/status']).match(/^Uid:\s+(\d+)/m)?.[1]);
  assert.ok(uid>0,service+' must run its main process without root');
  const bindings=container.HostConfig.PortBindings??{};
  if(service==='web') assert.deepEqual(bindings,{'8443/tcp':[{HostIp:'127.0.0.1',HostPort:'8443'}]});
  else assert.equal(Object.keys(bindings).length,0,service+' must publish no host ports');
  if(service!=='db') {
    assert.equal(container.HostConfig.ReadonlyRootfs,true);
    assert.ok(container.HostConfig.CapDrop.includes('ALL'));
    assert.ok(container.HostConfig.SecurityOpt.includes('no-new-privileges:true'));
  }
  const mounts=container.Mounts.filter(mount=>mount.Destination.startsWith('/run/secrets/'));
  assert.equal(mounts.length,{backend:1,web:3,db:2}[service]);
  assert.ok(mounts.every(mount=>mount.RW===false));
  const networks=Object.keys(container.NetworkSettings.Networks);
  if(service!=='web') {
    assert.equal(networks.length,1);
    assert.equal(run('docker',['network','inspect','--format','{{.Internal}}',networks[0]]),'true');
  }
  results.push({service,image:container.Image,healthy:true,uid,loopbackOnly:true,readOnlySecrets:true});
}
assert.equal(compose(['exec','-T','db','psql','-U','postgres','-d','bubble_staging','-Atc',"SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname='bubble_app';"]),'f|f|f');
const addresses=[...new Set(Object.values(networkInterfaces()).flat().filter(value=>value && !value.internal && value.family==='IPv4').map(value=>value.address))];
const probes=await Promise.all(addresses.map(host=>new Promise(resolve=>{
  const socket=createConnection({host,port:8443});let done=false;
  const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value);};
  socket.setTimeout(1000,()=>finish(false));socket.on('error',()=>finish(false));socket.on('connect',()=>finish(true));
})));
assert.ok(probes.every(accepted=>!accepted),'A non-loopback host address accepted TCP port 8443; investigate before allowing testers.');
console.log(JSON.stringify({services:results,restrictedDatabaseRole:true,nonLoopbackAddressesProbed:addresses.length,nonLoopbackConnectionsAccepted:0,externalInternetProbePerformed:false},null,2));
