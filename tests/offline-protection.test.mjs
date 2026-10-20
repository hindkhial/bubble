import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { nativeApiBase } from '../src/api/native.ts';
import { parseSnapshot, parseDraft, offlineResults } from '../src/api/offline.ts';
import { draftWriter } from '../src/storage/draftWriter.ts';
import { ApiClient } from '../src/api/client.ts';

const owner={id:'a6325112-8eb1-4f00-bc7d-302c80e781f2',email:'synthetic@example.test',displayName:'Synthetic'};
const item={id:'n',type:'NOTE',title:'Quiet Morning',body:'A BLUE sky',preview:'A BLUE sky',order:1,bubbleId:'home',meta:''};
const snapshot={version:1,owner,items:[item,{...item,id:'c',type:'CHECKLIST',title:'Errands',body:'',rows:[{id:'r',text:'Buy Apples',done:true}]}],verifiedAt:1000,cachedAt:1000,remainingMs:60000};
const draft={version:1,id:'d237847b-5e6e-4c66-ac09-247ac61b120c',kind:'NOTE',title:'Draft',body:'synthetic',rows:[],updatedAt:1000};

test('offline snapshots search only cached notes and checklist text without mutating data',()=>{
  const parsed=parseSnapshot(JSON.stringify(snapshot));
  assert.equal(offlineResults(parsed,'blue')[0].id,'n');assert.equal(offlineResults(parsed,'APPLES')[0].id,'c');
  assert.equal(offlineResults(parsed,'missing').length,0);assert.equal(offlineResults({...parsed,items:[]},'').length,0);
  assert.equal(parsed.items[1].rows[0].done,true);
  for(const bad of [{...snapshot,version:2},{...snapshot,remainingMs:0},{...snapshot,remainingMs:8*86400000},{...snapshot,items:[{...item,type:'PHOTO'}]},{...snapshot,items:[{...item,image:{uri:'https://example.test/image'}}]},{...snapshot,owner:null}])assert.throws(()=>parseSnapshot(JSON.stringify(bad)));
});

test('offline transport performs zero requests and cannot be silently enabled by session restoration',async()=>{
  let requests=0;let fetches=0;const calls=[];
  const bridge={lock:async()=>calls.push('lock'),prepareOnline:async()=>calls.push('online'),unlockOffline:async()=>JSON.stringify(snapshot),validateOffline:async()=>{},request:async()=>{requests++;return {status:204,body:''};}};
  const source=readFileSync(new URL('../src/api/transport.native.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};const context={exports,require:id=>id==='expo'?{requireOptionalNativeModule:()=>bridge}:id==='./native'?{nativeApiBase}:id==='./offline'?{parseSnapshot,parseDraft}:(()=>{throw new Error('Unexpected module '+id);})(),URL,Headers,Response,DOMException,fetch:()=>{fetches++;throw new Error('Unexpected fetch');}};
  vm.runInNewContext(js,context);
  const request=()=>exports.accountFetch('https://example.test/api/v1/users/me');
  await assert.rejects(request,/locked/);await exports.prepareNativeOnline();await request();assert.equal(requests,1);
  await exports.lockNativeAccess();await assert.rejects(request,/locked/);
  const cached=await exports.unlockNativeOffline('https://example.test');assert.equal(cached.owner.id,owner.id);
  for(const method of ['GET','POST','PATCH','DELETE'])await assert.rejects(()=>exports.accountFetch('https://example.test/api/v1/notes',{method}),/locked/);
  assert.equal(requests,1);assert.equal(fetches,0);assert.equal(calls.filter(c=>c==='online').length,1);
});

test('draft revisions and cleanup are ordered, immutable and recover after failed writes',async()=>{
  const events=[];let release;const first=new Promise(resolve=>{release=resolve;});let count=0;
  const writer=draftWriter(async d=>{events.push(d.body);if(++count===1)await first;if(d.body==='fail')throw new Error('storage unavailable');},async id=>{events.push('remove:'+id);});
  const mutable={...draft};const a=writer.save(mutable);mutable.body='changed after enqueue';
  const b=writer.save({...draft,body:'revision 2'});const c=writer.remove(draft.id);
  await Promise.resolve();assert.deepEqual(events,['synthetic']);release();await Promise.all([a,b,c]);
  assert.deepEqual(events,['synthetic','revision 2','remove:'+draft.id]);
  await assert.rejects(writer.save({...draft,body:'fail'}));await writer.save({...draft,body:'retained retry'});assert.equal(events.at(-1),'retained retry');
});

test('corrupt draft/publication formats fail closed while pending receipts remain non-retriable',()=>{
  assert.equal(parseDraft(JSON.stringify(draft)).body,'synthetic');
  assert.equal(parseDraft(JSON.stringify({...draft,publication:{state:'pending'}})).publication.state,'pending');
  for(const bad of [{...draft,version:2},{...draft,rows:[{}]},{...draft,id:'../other'},{...draft,publication:{state:'confirmed'}}])assert.throws(()=>parseDraft(JSON.stringify(bad)));
});

test('recovered publication keeps its expected owner across asynchronous CSRF retrieval',async()=>{
  const calls=[];let release;const token=new Promise(resolve=>{release=resolve;});
  const client=new ApiClient('https://example.test',async(url,init)=>{
    calls.push({url,init});
    if(url.endsWith('/auth/csrf')){await token;return new Response(JSON.stringify({token:'synthetic-csrf'}));}
    return new Response(JSON.stringify({id:'new-copy'}));
  });
  const publish=client.request('POST','/library/notes',{note:{title:'Synthetic',content:'Draft'}},undefined,'owner-a');
  await Promise.resolve();assert.equal(calls.length,1);release();await publish;
  assert.equal(calls.length,2);assert.equal(calls[1].init.headers['X-Bubble-Expected-Owner'],'owner-a');
  assert.equal(calls[1].init.headers['X-CSRF-TOKEN'],'synthetic-csrf');assert.equal(calls[1].init.method,'POST');
});
