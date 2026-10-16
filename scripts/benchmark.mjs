// Synthetic data only. The reference reproduces the previous grid algorithm.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { orderCollectionEntries } from '../src/utils/collectionOrder.ts';
const count=Number(process.env.BUBBLE_BENCH_SIZE || 10000);
const entries=Array.from({length:count},(_,i)=>({kind:'file',value:{id:String(i),bubbleId:'space'}}));
const pinsFor=()=>['file:9','file:2','file:5'];
function reference() {
  const pins=entries.flatMap(entry=>pinsFor(entry.value.bubbleId));
  return [...entries].sort((a,b)=>{
    const x=pins.indexOf(`${a.kind}:${a.value.id}`),y=pins.indexOf(`${b.kind}:${b.value.id}`);
    return x===-1&&y===-1?0:x===-1?1:y===-1?-1:x-y;
  });
}
function median(operation) {
  operation();
  const samples=Array.from({length:5},()=>{const start=performance.now();operation();return performance.now()-start;});
  return samples.sort((a,b)=>a-b)[2];
}
const optimized=()=>orderCollectionEntries(entries,'root',true,pinsFor).ordered;
assert.deepEqual(optimized(),reference());
console.log(JSON.stringify({entries:count,referenceMedianMs:median(reference),optimizedMedianMs:median(optimized),samples:5}));
