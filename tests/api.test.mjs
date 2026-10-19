import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError, apiBase } from '../src/api/client.ts';
import { AccountRepository, toItem, profileChanges } from '../src/api/account.ts';
import { copyLocalItems, importLedgerKey, verifyAccountCopy } from '../src/api/importLocal.ts';
const response=(body,status=200)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const serverItem={id:'11111111-1111-4111-8111-111111111111',title:'Test',content:'Body',pinned:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z'};
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};};
test('native copy retries verify known server IDs without uploading duplicate content',async()=>{
 const storage=memory();storage.setItem('bubble.items.v1','originals');let writes=0,checks=0;
 const repo={api:{base:'https://localhost'},saveNote:async()=>{writes++;return {id:serverItem.id};}};
 const selected=[{id:'local',title:'Test',type:'NOTE',body:'Body'}];
 const verify=async()=>{if(++checks===1)throw new ApiError('Read failed',401);};
 await assert.rejects(()=>copyLocalItems(repo,storage,'owner',selected,verify));
 assert.equal(JSON.parse(storage.getItem(importLedgerKey(repo.api.base,'owner'))).local.state,'pending');
 assert.equal(await copyLocalItems(repo,storage,'owner',selected,verify),0);
 assert.equal(writes,1);assert.equal(checks,2);assert.equal(storage.getItem('bubble.items.v1'),'originals');
});
test('native copy verification rejects mismatched content and incomplete checklist rows',async()=>{
 const repo={api:{request:async()=>({...serverItem,content:'different'})}};
 await assert.rejects(()=>verifyAccountCopy(repo,serverItem.id,{type:'NOTE',title:'Test',body:'Body'}),/did not match/);
 await assert.rejects(()=>verifyAccountCopy(repo,serverItem.id,{type:'CHECKLIST',title:'Test',body:'',rows:[{text:'Tea',done:true}]}),/did not match/);
 await assert.rejects(()=>verifyAccountCopy(repo,'invalid',{type:'NOTE',title:'Test',body:'Body'}),/invalid copy ID/);
});
test('private tester gate errors are distinct from an invalid application password',async()=>{
 const gated=new AccountRepository(new ApiClient('https://localhost',async()=>new Response('',{status:401,headers:{'WWW-Authenticate':'Basic realm="Private beta"'}})));
 await assert.rejects(()=>gated.login('synthetic@example.test','synthetic-test-password'),error=>error instanceof ApiError&&error.privateGate&&/invitation/.test(error.message));
 const denied=new AccountRepository(new ApiClient('https://localhost',async url=>url.endsWith('/csrf')?response({token:'synthetic-csrf'}):response({},401)));
 await assert.rejects(()=>denied.login('synthetic@example.test','wrong-synthetic-password'),error=>error instanceof ApiError&&!error.privateGate&&error.message==='Email or password is incorrect.');
});
test('safe cancellation works without AbortSignal.any and releases caller listeners',async()=>{
 const any=AbortSignal.any;AbortSignal.any=undefined;
 try {
  const caller=new AbortController();let removed=0;
  const remove=caller.signal.removeEventListener.bind(caller.signal);
  caller.signal.removeEventListener=(...args)=>{removed++;return remove(...args);};
  const api=new ApiClient('http://localhost',async()=>response({ok:true}));
  assert.deepEqual(await api.request('GET','/notes',undefined,caller.signal),{ok:true});
  assert.equal(removed,1);
 } finally {AbortSignal.any=any;}
});
test('cancellation while reading JSON remains an AbortError',async()=>{
 const caller=new AbortController();
 const api=new ApiClient('http://localhost',async()=>({ok:true,status:200,json:async()=>{caller.abort();throw new Error('body aborted');}}));
 await assert.rejects(()=>api.request('GET','/notes',undefined,caller.signal),error=>error.name==='AbortError');
});
test('cancellation between pages sends no subsequent page request',async()=>{
 const caller=new AbortController();let calls=0;
 const repo=new AccountRepository(new ApiClient('http://localhost',async()=>{calls++;caller.abort();return response({content:[serverItem],totalPages:2});}));
 await assert.rejects(()=>repo.pages('/notes',100,caller.signal),error=>error.name==='AbortError');assert.equal(calls,1);
});
test('account loading uses paginated checklist items without detail fan-out',async()=>{
 const calls=[];
 const repo=new AccountRepository(new ApiClient('http://localhost',async url=>{
  calls.push(url);const lists=url.includes('/checklists');
  return response({content:lists?Array.from({length:20},(_,i)=>({...serverItem,id:'list-'+i,items:[{id:'row-'+i,content:'Task',completed:false}]})):[],totalPages:1});
 }));
 const value=await repo.content('task');assert.equal(calls.length,2);assert.equal(value.items.length,20);
 assert.ok(calls.find(url=>url.includes('includeItems=true')&&url.includes('size=20')&&url.includes('q=task')));
 assert.equal(value.items[0].rows[0].text,'Task');
});
test('aborted safe reads stop before sending and cancel an in-flight request',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();
 const api=new ApiClient('http://localhost',async()=>{calls++;return response({});});
 await assert.rejects(()=>api.request('GET','/notes',undefined,controller.signal),error=>error.name==='AbortError');assert.equal(calls,0);
 const pending=new AbortController();
 const waiting=new ApiClient('http://localhost',async(_url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true})));
 const request=waiting.request('GET','/notes',undefined,pending.signal);pending.abort();
 await assert.rejects(()=>request,error=>error.name==='AbortError');
});
test('older backend summaries fall back to owned detail reads without losing checklist rows',async()=>{
 const calls=[];const repo=new AccountRepository(new ApiClient('http://localhost',async url=>{
  calls.push(url);
  if(url.includes('/notes'))return response({content:[],totalPages:1});
  if(url.includes('?'))return response({content:[serverItem],totalPages:1});
  return response({...serverItem,items:[{id:'legacy-row',content:'Keep this task',completed:true}]});
 }));
 const value=await repo.content();assert.equal(calls.length,3);assert.equal(value.items[0].rows[0].text,'Keep this task');assert.equal(value.items[0].rows[0].done,true);
});
test('incomplete checklist detail is rejected instead of presenting an empty editable list',async()=>{
 const repo=new AccountRepository(new ApiClient('http://localhost',async url=>response(url.includes('/notes')?{content:[],totalPages:1}:url.includes('?')?{content:[serverItem],totalPages:1}:serverItem)));
 await assert.rejects(()=>repo.content(),/incomplete checklist items/);
});
test('API URL rejects unsafe schemes and embedded credentials',()=>{assert.equal(apiBase('http://localhost:8080/'),'http://localhost:8080');for(const value of ['javascript:bad','https://user:pass@example.test','https://example.test?q=secret'])assert.throws(()=>apiBase(value));});
test('credentials and CSRF are centralized and login refreshes the token',async()=>{
 const calls=[];const api=new ApiClient('http://localhost:8080',async(url,options)=>{calls.push({url,options});return response(url.endsWith('/csrf')?{token:'token-'+calls.length}:serverItem);});
 const repo=new AccountRepository(api);await repo.login('test@example.test','test-only-password');await repo.api.request('PATCH','/profile',{bio:'hello'});
 assert.equal(calls.filter(call=>call.url.endsWith('/csrf')).length,2);assert.ok(calls.every(call=>call.options.credentials==='include'));assert.equal(calls[1].options.headers['X-CSRF-TOKEN'],'token-1');assert.equal(calls[3].options.headers['X-CSRF-TOKEN'],'token-3');
});
test('concurrent writes share a CSRF read without sharing request bodies',async()=>{let reads=0;const api=new ApiClient('http://localhost',async(url)=>{if(url.endsWith('/csrf')){reads++;return response({token:'one'});}return response({});});await Promise.all([api.request('PATCH','/profile',{bio:'x'}),api.request('PATCH','/preferences',{themeMode:'DARK'})]);assert.equal(reads,1);});
test('errors never display private server messages and auth resets CSRF',async()=>{let calls=0;const api=new ApiClient('http://localhost',async(url)=>{calls++;return url.endsWith('/csrf')?response({token:'x'}):response({message:'private database password'},401);});await assert.rejects(()=>api.request('PATCH','/profile',{}),error=>error instanceof ApiError&&error.status===401&&!error.message.includes('private'));await assert.rejects(()=>api.request('PATCH','/profile',{}));assert.equal(calls,4);});
test('failed mutations are not automatically retried and report uncertainty',async()=>{let writes=0;const api=new ApiClient('http://localhost',async(url)=>{if(url.endsWith('/csrf'))return response({token:'x'});writes++;throw new Error('offline');});await assert.rejects(()=>api.request('POST','/notes',{}),error=>error.uncertain&&error.message.includes('may have reached'));assert.equal(writes,1);});
test('logout uses POST, clears CSRF and handles empty responses',async()=>{const calls=[];const repo=new AccountRepository(new ApiClient('http://localhost',async(url,options)=>{calls.push([url,options]);return url.endsWith('/csrf')?response({token:'x'}):response(null,204);}));await repo.logout();assert.equal(calls[1][1].method,'POST');});
test('pagination retrieves every page and deduplicates shifting results',async()=>{const repo=new AccountRepository(new ApiClient('http://localhost',async(url)=>response({content:url.includes('page=0')?[serverItem]:[serverItem,{...serverItem,id:'second'}],totalPages:2})));assert.equal((await repo.pages('/notes')).length,2);});
test('checklists use one atomic save with explicit order and real IDs only',async()=>{const calls=[];const repo=new AccountRepository(new ApiClient('http://localhost',async(url,options)=>{calls.push([url,options]);return response(url.endsWith('/csrf')?{token:'x'}:{...serverItem,items:[]});}));await repo.saveChecklist({title:'List',rows:[{id:'row-local',text:'One',done:true},{id:serverItem.id,text:'Two',done:false}]},serverItem.id);const write=calls[1];assert.equal(write[1].method,'PUT');assert.ok(write[0].endsWith('/content'));assert.deepEqual(JSON.parse(write[1].body).items.map(row=>row.id),[null,serverItem.id]);});
test('server data maps to existing UI shapes without reusing local IDs',()=>{const note=toItem(serverItem);assert.equal(note.id,serverItem.id);assert.equal(note.body,'Body');assert.equal(note.type,'NOTE');const list=toItem({...serverItem,items:[{id:'row',content:'Tea',completed:true,position:0}]},true);assert.deepEqual(list.rows,[{id:'row',text:'Tea',done:true}]);});
test('explicit copying preserves all local keys and skips confirmed copies',async()=>{const storage=memory();storage.setItem('bubble.items.v1','original private data');let writes=0;const repo={api:{base:'http://localhost'},saveNote:async()=>{writes++;return{id:serverItem.id};}};const note={id:'local-1',type:'NOTE',title:'Local',body:'Private'};assert.equal(await copyLocalItems(repo,storage,'owner',[note]),1);assert.equal(await copyLocalItems(repo,storage,'owner',[note]),0);assert.equal(writes,1);assert.equal(storage.getItem('bubble.items.v1'),'original private data');});
test('uncertain imports remain pending and cannot be duplicated on retry',async()=>{const storage=memory();let writes=0;const repo={api:{base:'http://localhost'},saveNote:async()=>{writes++;throw new Error('lost response');}};const selected=[{id:'local',type:'NOTE',title:'Local',body:'Body'}];await assert.rejects(()=>copyLocalItems(repo,storage,'owner',selected));await assert.rejects(()=>copyLocalItems(repo,storage,'owner',selected),/uncertain/);assert.equal(writes,1);});
test('storage failures prevent uploads and copy history is account-scoped',async()=>{let writes=0;const repo={api:{base:'http://localhost'},saveNote:async()=>{writes++;return{id:'new'};}};await assert.rejects(()=>copyLocalItems(repo,{getItem:()=>null,setItem:()=>{throw new Error('quota');}},'owner',[{id:'local',type:'NOTE'}]));assert.equal(writes,0);assert.notEqual(importLedgerKey('http://localhost','one'),importLedgerKey('http://localhost','two'));});
test('photos are never sent through the content copy path',async()=>{const storage=memory();assert.equal(await copyLocalItems({api:{base:'http://localhost'}},storage,'owner',[{id:'photo',type:'PHOTO'}]),0);});

test('browser fetch is invoked with a valid global receiver',async()=>{const api=new ApiClient('http://localhost',function(){assert.equal(this,globalThis);return Promise.resolve(response({}));});await api.request('GET','/users/me');});

test('invalid API configuration does not break construction or local-only use',async()=>{let calls=0;const api=new ApiClient('invalid URL',async()=>{calls++;return response({});});await assert.rejects(()=>api.request('GET','/users/me'),/device content is unchanged/);assert.equal(calls,0);});
test('duplicate local IDs stop copying before any server write',async()=>{let writes=0;const repo={api:{base:'http://localhost'},saveNote:async()=>{writes++;return{id:'new'};}};const value={id:'same',type:'NOTE',title:'one',body:'body'};await assert.rejects(()=>copyLocalItems(repo,memory(),'owner',[value,{...value,title:'two'}]),/duplicate IDs/);assert.equal(writes,0);});

test('malformed local checklist data is blocked before upload',async()=>{let writes=0;const repo={api:{base:'http://localhost'},saveChecklist:async()=>{writes++;return{id:'new'};}};await assert.rejects(()=>copyLocalItems(repo,memory(),'owner',[{id:'local',type:'CHECKLIST',title:'Invalid',body:'',rows:'corrupt'}]),/validated/);assert.equal(writes,0);});
test('a definite rejected copy can be corrected while uncertain copies stay blocked',async()=>{const storage=memory();let writes=0;const repo={api:{base:'http://localhost'},saveNote:async()=>{writes++;if(writes===1)throw new ApiError('Invalid',400);return{id:'new'};}};const selected=[{id:'local',type:'NOTE',title:'Title',body:'body'}];await assert.rejects(()=>copyLocalItems(repo,storage,'owner',selected));assert.equal(await copyLocalItems(repo,storage,'owner',selected),1);});

test('profile patches preserve omitted nullable fields and legacy avatar references',()=>{const current={displayName:'Before',bio:null,avatarReference:'legacy-reference',createdAt:'date',updatedAt:'date'};assert.deepEqual(profileChanges(current,{displayName:'After',bio:'',avatarReference:'legacy-reference'}),{displayName:'After'});assert.deepEqual(profileChanges(current,{displayName:'Before',bio:'',avatarReference:null}),{avatarReference:null});});


test('server failures after a mutation remain uncertain and are never retried', async () => {
  let writes = 0;
  const api = new ApiClient('http://localhost', async (_url, options) => {
    if (options.method === 'GET') return response({ token: 'test-token' });
    writes++;
    return response({}, 502);
  });
  await assert.rejects(() => api.request('POST', '/notes', { title: 'Test', content: 'Body' }),
    error => error instanceof ApiError && error.status === 502 && error.uncertain);
  assert.equal(writes, 1);
});

test('read failures do not mark a mutation outcome as uncertain', async () => {
  const api = new ApiClient('http://localhost', async () => response({}, 503));
  await assert.rejects(() => api.request('GET', '/notes'), error => error.status === 503 && !error.uncertain);
});
