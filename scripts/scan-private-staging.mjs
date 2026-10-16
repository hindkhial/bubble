// Scans exported local images; scanner never receives the Docker socket or secrets.
import {mkdirSync,readFileSync,writeFileSync,realpathSync,rmSync} from 'node:fs';
import {dirname,basename,join,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const scanner='aquasec/trivy@sha256:2416d1f74045b57274df1a340eee6b510cacd73c66a6ccb8da092b117eb7d222';
const input=process.argv[2];
if(!input || !isAbsolute(input)) throw new Error('Pass a NEW absolute report directory outside Git.');
const directory=join(realpathSync(dirname(input)),basename(input));
const repo=realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const location=relative(repo,directory);
if(!(location==='..' || location.startsWith('..'+sep) || isAbsolute(location))) throw new Error('Reports must be outside the repo.');
mkdirSync(directory,{mode:0o700});
// Database downloads can exceed tmpfs capacity; keep temporary public scanner
// data in the protected report mount, without relaxing container privileges.
mkdirSync(join(directory,'tmp'),{mode:0o700});
const run=(command,args)=>{
  const result=spawnSync(command,args,{cwd:repo,encoding:'utf8',maxBuffer:8*1024*1024});
  if(result.status!==0) throw new Error('Image scanning did not complete: '+command+' '+args[0]+'. No clean result is claimed.');
  return result.stdout;
};
const config=JSON.parse(run('sh',['deploy/staging/compose.sh','config','--format','json']));
const summary={timestamp:new Date().toISOString(),scanner,images:[]};
for(const service of ['backend','web','db']) {
  const image=config.services[service].image;
  const id=JSON.parse(run('docker',['image','inspect',image,'--format','{{json .Id}}']));
  const container=run('sh',['deploy/staging/compose.sh','ps','-q',service]).trim();
  const runtimeImage=container ? run('docker',['inspect','--format','{{.Image}}',container]).trim() : undefined;
  const runtimeManifest=container ? JSON.parse(run('docker',['inspect','--format','{{json .ImageManifestDescriptor}}',container]))?.digest : undefined;
  const archive=join(directory,service+'.tar');
  run('docker',['save',image,'--output',archive]);
  run('docker',['run','--rm','--user',process.getuid()+':'+process.getgid(),'--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=256m','-e','TRIVY_DISABLE_TELEMETRY=true','-e','TMPDIR=/scan/tmp','-v',directory+':/scan',
    scanner,'image','--input','/scan/'+service+'.tar','--cache-dir','/scan/cache','--timeout','10m','--scanners','vuln','--format','json','--output','/scan/'+service+'.json']);
  const report=JSON.parse(readFileSync(join(directory,service+'.json'),'utf8'));
  if(!report.Results?.some(result=>result.Class==='os-pkgs') || (service==='backend' && !report.Results.some(result=>result.Type==='jar')))
    throw new Error('Expected OS/Java package coverage is missing; no clean result is claimed.');
  // Docker may expose an OCI index ID while a container exposes its platform
  // manifest ID. Bind the report's config digest to the actual archive/runtime.
  const pairs=[];const descriptors=new Set();
  const readTar=path=>JSON.parse(run('tar',['-xOf',archive,path]));
  const walk=(descriptor,depth=0)=>{
    if(depth>4 || !/^sha256:[a-f0-9]{64}$/.test(descriptor.digest)) throw new Error('Unsupported image archive descriptor.');
    descriptors.add(descriptor.digest);
    const value=readTar('blobs/sha256/'+descriptor.digest.slice(7));
    if(value.manifests)for(const child of value.manifests)walk(child,depth+1);
    if(value.config)pairs.push({manifest:descriptor.digest,config:value.config.digest});
  };
  for(const descriptor of readTar('index.json').manifests)walk(descriptor);
  const scannedConfig=report.Metadata?.ImageID;
  if(!pairs.some(pair=>pair.config===scannedConfig)) throw new Error('Scanner config digest is absent from the exported archive.');
  if(runtimeImage) {
    const runtime=runtimeManifest??runtimeImage;
    const platform=pairs.find(pair=>pair.manifest===runtime || pair.config===runtime);
    if(platform ? platform.config!==scannedConfig : !descriptors.has(runtime))
      throw new Error('Running image is not the scanned archive/config. Reconcile the release before claiming a pass.');
  }
  const counts={};
  for(const result of report.Results??[]) for(const item of result.Vulnerabilities??[]) counts[item.Severity]=(counts[item.Severity]??0)+1;
  summary.images.push({service,image,id,runtimeImage,runtimeManifest,scannedConfig,counts});
  rmSync(archive);
}
writeFileSync(join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(summary,null,2));
if(summary.images.some(image=>(image.counts.CRITICAL??0)+(image.counts.HIGH??0)>0)) process.exitCode=2;
