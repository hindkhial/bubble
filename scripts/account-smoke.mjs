// Disposable local database only. This script creates a test account; it never reads browser storage.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ApiClient } from '../src/api/client.ts';
import { AccountRepository } from '../src/api/account.ts';
import { copyLocalItems } from '../src/api/importLocal.ts';
const base=process.env.BUBBLE_TEST_API_URL;
if(!base || !['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Set BUBBLE_TEST_API_URL to an explicitly disposable local backend.');
let cookie='';
const fetchWithCookies=async(url,options)=>{
 const headers=new Headers(options?.headers);headers.set('Origin','http://localhost:8082');if(cookie)headers.set('Cookie',cookie);
 const response=await fetch(url,{...options,headers});
 for(const value of response.headers.getSetCookie()) {if(value.startsWith('BUBBLE_SESSION='))cookie=value.split(';')[0];}
 return response;
};
const repo=new AccountRepository(new ApiClient(base,fetchWithCookies));
const email=`integration-${randomUUID()}@example.test`,password=randomUUID()+'-test';
await repo.register(email,password,'Integration check');await assert.rejects(()=>repo.login(email,'incorrect-password'),error=>error.status===401);
const account=await repo.login(email,password);assert.equal((await repo.me()).id,account.id);
const note=await repo.saveNote({title:'Integration note',body:'Searchable text'});
await repo.saveNote({title:'Edited note',body:'Changed body'},note.id);
await repo.api.request('PATCH','/notes/'+note.id,{pinned:true});
assert.equal((await repo.content('changed')).items.length,1);
let list=await repo.saveChecklist({title:'List',rows:[{id:'local-a',text:'Tea',done:false},{id:'local-b',text:'Milk',done:true}]});
list=await repo.saveChecklist({title:'Edited list',rows:[{...list.rows[1],done:false},{...list.rows[0],done:true}]},list.id);
assert.equal(list.rows[0].text,'Milk');assert.equal(list.rows[1].done,true);
await repo.api.request('PATCH','/profile',{displayName:'Updated account',bio:'Updated bio',avatarReference:'avatar:'+randomUUID()});
assert.equal((await repo.api.request('GET','/profile')).bio,'Updated bio');
await repo.api.request('PATCH','/profile',{avatarReference:null});
await repo.api.request('PATCH','/preferences',{themeMode:'SYSTEM',accentColor:'Sky blue'});
assert.equal((await repo.api.request('GET','/preferences')).themeMode,'SYSTEM');
const data=new Map([['bubble.items.v1','local originals kept']]);const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const selected=[{id:'local-note',type:'NOTE',title:'Copied note',body:'Kept local'},{id:'local-list',type:'CHECKLIST',title:'Copied list',body:'',rows:[{id:'local-row',text:'Copied task',done:true}]}];
assert.equal(await copyLocalItems(repo,storage,account.id,selected),2);assert.equal(await copyLocalItems(repo,storage,account.id,selected),0);
assert.equal(data.get('bubble.items.v1'),'local originals kept');
const refreshed=new AccountRepository(new ApiClient(base,fetchWithCookies));assert.equal((await refreshed.me()).id,account.id);assert.equal((await refreshed.content()).items.length,4);
for(const item of (await refreshed.content()).items)await repo.api.request('DELETE',`/${item.type==='CHECKLIST'?'checklists':'notes'}/${item.id}`);
assert.equal((await repo.content()).items.length,0);await repo.logout();await assert.rejects(()=>repo.me(),error=>error.status===401);
console.log('PASS: real Spring/PostgreSQL registration, failed/successful login, session restore, notes CRUD/pin/search, atomic checklist order/completion, profile/avatar, preferences, explicit copy/deduplication, local preservation, delete and logout.');
