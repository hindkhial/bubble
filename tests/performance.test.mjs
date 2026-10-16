import test from 'node:test';
import assert from 'node:assert/strict';
import { orderCollectionEntries } from '../src/utils/collectionOrder.ts';
import { searchEverything } from '../src/utils/dashboard.ts';
const entry=(id,bubbleId='space')=>({kind:'file',value:{id,bubbleId,type:'NOTE',title:id,body:'needle',order:0}});
test('large collection pin ordering reads each scope once and preserves unpinned order',()=>{
  const entries=Array.from({length:10000},(_,i)=>entry(String(i)));
  let calls=0;const sorted=orderCollectionEntries(entries,'root',true,()=>{calls++;return ['file:9','file:2'];});
  assert.equal(calls,1);assert.deepEqual(sorted.ordered.slice(0,4).map(e=>e.value.id),['9','2','0','1']);
  assert.equal(entries[0].value.id,'0');assert.equal(sorted.pins.size,2);
});
test('pin order is stable across scopes, repeated pins and missing entries',()=>{
  const entries=[entry('a','one'),entry('b','two'),entry('c','one'),entry('d','two')];
  const pins={one:['file:c','file:a'],two:['file:b','file:a','file:missing']};
  assert.deepEqual(orderCollectionEntries(entries,'root',true,s=>pins[s]).ordered.map(e=>e.value.id),['c','a','b','d']);
  assert.deepEqual(orderCollectionEntries(entries,'root',false,()=>[]).ordered,entries);
});
test('large note and checklist search keeps matching rows, filters and stable order',()=>{
  const items=Array.from({length:10000},(_,i)=>({...entry(String(i)).value,body:i===9999?'UNIQUE NEEDLE':'other'}));
  const list={...entry('list').value,type:'CHECKLIST',body:'',rows:Array.from({length:1000},(_,i)=>({text:i===999?'needle task':'task',done:false}))};
  assert.equal(searchEverything([],items,'unique','Notes',new Set()).length,1);
  assert.equal(searchEverything([],[...items,list],'NEEDLE TASK','Lists',new Set())[0].value.id,'list');
});
