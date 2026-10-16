// Synthetic localhost fixtures only. State contains disposable credentials: never commit it.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,statSync,realpathSync} from 'node:fs';
import {isAbsolute,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ApiClient} from '../src/api/client.ts';
import {AccountRepository} from '../src/api/account.ts';
import {validateStagingUrl} from './validate-staging-url.mjs';
import {stagingAuthorization} from './staging-auth.mjs';

const base=validateStagingUrl(process.env.BUBBLE_TEST_API_URL);
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname) || process.env.BUBBLE_E2E_DISPOSABLE!=='1')
  throw new Error('Explicitly acknowledge isolated synthetic localhost staging.');
const file=process.env.BUBBLE_TEST_STATE_FILE;
if(!file || !isAbsolute(file)) throw new Error('Set an absolute protected BUBBLE_TEST_STATE_FILE outside Git.');
const location=relative(realpathSync(fileURLToPath(new URL('../',import.meta.url))),realpathSync(dirname(file)));
if(!(location==='..' || location.startsWith('..'+sep) || isAbsolute(location))) throw new Error('Fixture state must stay outside the repository.');
const phase=process.argv[2];
if(!['seed','session','restart'].includes(phase)) throw new Error('Use seed, session, or restart.');
let state;
if(phase==='seed') {
  writeFileSync(file,'{}',{flag:'wx',mode:0o600});
  state={email:'staging-'+randomUUID()+'@example.test',password:randomUUID()+'-fixture',cookie:''};
  // Keep generated credentials available for operator reconciliation if a write
  // fails ambiguously; do not retry registration automatically.
  writeFileSync(file,JSON.stringify(state)+'\n',{mode:0o600});
} else {
  if((statSync(file).mode&0o077)!==0) throw new Error('Fixture state must be owner-only.');
  try {state=JSON.parse(readFileSync(file,'utf8'));}
  catch {throw new Error('Cannot read the protected synthetic fixture state.');}
}
const authorization=stagingAuthorization(base);assert.ok(authorization);
let cookie=state.cookie;
const fetcher=async(url,options)=>{
  const headers=new Headers(options?.headers);headers.set('Origin',base);headers.set('Authorization',authorization);
  if(cookie)headers.set('Cookie',cookie);
  const response=await fetch(url,{...options,headers});
  for(const value of response.headers.getSetCookie())if(value.startsWith('BUBBLE_SESSION='))cookie=value.split(';')[0];
  return response;
};
const repo=new AccountRepository(new ApiClient(base,fetcher));
if(phase==='seed') {
  await repo.register(state.email,state.password,'Staging tester');
  state.id=(await repo.login(state.email,state.password)).id;
  const note=await repo.saveNote({title:'Staging preserved note',body:'Synthetic original'});
  state.note=await repo.saveNote({title:'Staging preserved note',body:'Synthetic edited text'},note.id);
  state.list=await repo.saveChecklist({title:'Staging preserved checklist',rows:[{id:'new-1',text:'Completed fixture',done:true},{id:'new-2',text:'Pending fixture',done:false}]});
  await repo.api.request('PATCH','/profile',{displayName:'Staging tester',bio:'Synthetic recovery verification'});
  await repo.api.request('PATCH','/preferences',{themeMode:'DARK',accentColor:'Sky blue'});
  state.profile=await repo.api.request('GET','/profile');state.preferences=await repo.api.request('GET','/preferences');
} else if(phase==='restart') {
  await assert.rejects(()=>repo.me(),error=>error.status===401);
  await repo.login(state.email,state.password);
}
assert.equal((await repo.me()).id,state.id);
const items=(await repo.content()).items;
for(const expected of [state.note,state.list]) assert.deepEqual(JSON.parse(JSON.stringify(items.find(item=>item.id===expected.id))),JSON.parse(JSON.stringify(expected)));
assert.deepEqual(await repo.api.request('GET','/profile'),state.profile);
assert.deepEqual(await repo.api.request('GET','/preferences'),state.preferences);
assert.equal((await repo.content('SYNTHETIC EDITED')).items.length,1);
assert.equal((await repo.content('COMPLETED FIXTURE')).items.length,1);
state.cookie=cookie;writeFileSync(file,JSON.stringify(state)+'\n',{mode:0o600});
console.log('PASS: '+phase+' verifies synthetic notes/checklist completion, search, profile, appearance and account session semantics.');
