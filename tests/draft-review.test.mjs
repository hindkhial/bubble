import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real review component and callbacks with host hooks/native stubs.
// Crypto, Keychain and real uploads are deliberately not performed here.
function harness({fail=false,empty=false}={}){
  const draft={version:1,id:'d237847b-5e6e-4c66-ac09-247ac61b120c',kind:'NOTE',title:'Synthetic',body:empty?'':'Protected text',rows:[],updatedAt:100};
  const records=new Map([[draft.id,draft]]),events=[],cells=[];let cursor=0,nodes=[];
  const jsx=(type,props)=>{const n={type,props};nodes.push(n);return n;};
  const state=initial=>{const index=cursor++;if(!(index in cells))cells[index]=typeof initial==='function'?initial():initial;return [cells[index],value=>{cells[index]=typeof value==='function'?value(cells[index]):value;}];};
  const account={user:{id:'owner-a'},publishDraftCopy:async(owner,value)=>{events.push(['publish',owner,value]);if(fail)throw new Error('uncertain response');return {id:'new-copy'};}};
  const dependencies={
    react:{useState:state,useRef:value=>{const [ref]=state(()=>({current:value}));return ref;},useEffect:()=>{}},
    'react/jsx-runtime':{jsx,jsxs:jsx},
    'react-native':{Pressable:'button',ScrollView:'scroll',Text:'text',View:'view'},
    './MotionAwareModal':{MotionAwareModal:'modal'},
    'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:50,bottom:34})},
    '../state/Account':{useAccount:()=>account,configuredApi:()=>'https://example.test'},
    '../theme/Theme':{useTheme:()=>({colors:{}})},
    '../api/transport':{
      protectedDrafts:async(base,owner)=>{events.push(['list',base,owner]);return [...records.values()].map(d=>structuredClone(d));},
      saveProtectedDraft:async(base,owner,d)=>{events.push(['save',owner,d.publication?.state]);records.set(d.id,structuredClone(d));},
      removeProtectedDraft:async(base,owner,id)=>{events.push(['remove',owner,id]);records.delete(id);},
    },
  };
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL('../src/components/ProtectedDraftReview.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)(name=>{if(!(name in dependencies))throw new Error(name);return dependencies[name];},module,module.exports);
  const render=()=>{cursor=0;nodes=[];module.exports.ProtectedDraftReview();};
  const text=n=>Array.isArray(n)?n.map(text).join(''):typeof n==='string'?n:n?.props?text(n.props.children):'';
  const click=async label=>{render();const n=nodes.find(n=>n.type==='button'&&text(n)===label);assert.ok(n,'Missing button '+label);n.props.onPress();for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));render();};
  render();return {events,records,render,click,buttons:()=>nodes.filter(n=>n.type==='button').map(text)};
}

test('draft review requires selection plus confirmation and persists uncertainty before publishing a new copy',async()=>{
  const h=harness();assert.deepEqual(h.events,[]);
  await h.click('Review protected drafts');await h.click('Review Synthetic');
  assert.equal(h.events.filter(e=>e[0]==='publish').length,0);
  await h.click('Publish as a new copy…');assert.equal(h.events.filter(e=>e[0]==='publish').length,0);
  await h.click('Confirm: publish a new copy to my account');
  assert.deepEqual(h.events.slice(1).map(e=>[e[0],e[1],e[0]==='save'?e[2]:undefined]),[['save','owner-a','pending'],['publish','owner-a',undefined],['save','owner-a','confirmed']]);
  const published=h.events.find(e=>e[0]==='publish');assert.equal(published[2].body,'Protected text');
  await h.click('Back to draft list');await h.click('Review Synthetic');
  assert.ok(!h.buttons().includes('Publish as a new copy…'));assert.equal(h.events.filter(e=>e[0]==='publish').length,1);
});

test('uncertain publication remains pending through reload and cannot automatically retry',async()=>{
  const h=harness({fail:true});await h.click('Review protected drafts');await h.click('Review Synthetic');await h.click('Publish as a new copy…');await h.click('Confirm: publish a new copy to my account');
  assert.equal([...h.records.values()][0].publication.state,'pending');
  await h.click('Back to draft list');await h.click('Review Synthetic');
  assert.ok(!h.buttons().includes('Publish as a new copy…'));assert.equal(h.events.filter(e=>e[0]==='publish').length,1);
});

test('discard requires confirmation and affects only the selected recovery draft',async()=>{
  const h=harness();await h.click('Review protected drafts');await h.click('Review Synthetic');await h.click('Discard protected draft…');
  assert.equal(h.records.size,1);assert.equal(h.events.filter(e=>e[0]==='remove').length,0);
  await h.click('Keep protected draft');assert.equal(h.records.size,1);
  await h.click('Discard protected draft…');await h.click('Confirm: discard this protected draft');assert.equal(h.records.size,0);
  assert.equal(h.events.filter(e=>e[0]==='publish').length,0);
});
