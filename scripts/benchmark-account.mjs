// Run only against an explicitly disposable local backend. No browser storage is read.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { ApiClient } from '../src/api/client.ts';
import { AccountRepository } from '../src/api/account.ts';
const base=process.env.BUBBLE_TEST_API_URL;
if(process.env.BUBBLE_E2E_DISPOSABLE!=='1'||!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Confirm an isolated localhost backend with BUBBLE_E2E_DISPOSABLE=1 and BUBBLE_TEST_API_URL.');
const origin=process.env.BUBBLE_TEST_ORIGIN||'http://localhost:8091';
let cookie='',requests=0;
const client=new ApiClient(base,async(url,options)=>{
  requests++;const headers=new Headers(options.headers);headers.set('Origin',origin);if(cookie)headers.set('Cookie',cookie);
  const response=await fetch(url,{...options,headers});
  for(const value of response.headers.getSetCookie())if(value.startsWith('BUBBLE_SESSION='))cookie=value.split(';')[0];
  return response;
});
const repo=new AccountRepository(client),password=randomUUID()+'-test',email=randomUUID()+'@example.test';
await repo.register(email,password,'Synthetic benchmark');await repo.login(email,password);
const created=[];
try {
  for(let i=0;i<20;i++)created.push(await repo.saveChecklist({title:'Synthetic '+i,rows:Array.from({length:25},(_,j)=>({id:'local-'+j,text:'Synthetic task '+j,done:j%2===0}))}));
  // Reference reproduces the prior 10-at-a-time detail fan-out, using unchanged summary/detail APIs.
  const reference=async()=>{
    const [notes,lists]=await Promise.all([repo.pages('/notes'),repo.pages('/checklists')]);
    const details=[];
    for(let i=0;i<lists.length;i+=10)details.push(...await Promise.all(lists.slice(i,i+10).map(list=>client.request('GET','/checklists/'+list.id))));
    return {notes,details};
  };
  const old=await reference(),current=await repo.content();
  assert.equal(old.details.length,20);assert.equal(current.items.length,20);
  assert.deepEqual(current.items.map(x=>x.rows.map(r=>[r.text,r.done])),old.details.map(x=>x.items.map(r=>[r.content,r.completed])));
  const samples={reference:[],optimized:[]},counts={};
  for(let run=0;run<7;run++)for(const name of run%2?['optimized','reference']:['reference','optimized']) {
    requests=0;const start=performance.now();await (name==='reference'?reference():repo.content());
    samples[name].push(performance.now()-start);counts[name]=requests;
  }
  const median=values=>values.sort((a,b)=>a-b)[3];
  assert.equal(counts.reference,22);assert.equal(counts.optimized,2);
  console.log(JSON.stringify({lists:20,rowsPerList:25,samples:7,requests:counts,medianMs:{reference:median(samples.reference),optimized:median(samples.optimized)}}));
} finally {
  for(const item of created)await client.request('DELETE','/checklists/'+item.id);
  await repo.logout();
}
