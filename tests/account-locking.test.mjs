import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { ApiError } from '../src/api/client.ts';

test('actual account provider starts without HTTP and locks interrupted verification without stuck loading or late fetches',async()=>{
  const cells=[],effects=[],requests=[],storage=new Map([['bubble.items.v1','retained legacy fixture']]);let cursor=0,listener,waitForMe=null;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const state=initial=>{const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v;}];};
  const memo=(fn,deps)=>{const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={deps,value:fn()};return cells[i].value;};
  const react={createContext:()=>({Provider:'provider'}),useState:state,useRef:v=>{const [r]=state(()=>({current:v}));return r;},useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useContext:()=>{},useEffect:(effect,deps)=>{const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=effect();});}}};
  const me={id:'a6325112-8eb1-4f00-bc7d-302c80e781f2',email:'synthetic@example.test'};
  class Client{resetCsrf(){}async request(method,path){requests.push(path);return path==='/profile'?{displayName:'Synthetic'}:{themeMode:'LIGHT',accentColor:'Lavender'};}}
  class Repository{constructor(api){this.api=api;}async me(){requests.push('/users/me');return waitForMe?await waitForMe:me;}async content(){requests.push('/content');return{items:[],pinned:[]};}}
  const dependencies={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props})},'react-native':{Platform:{OS:'ios'},AppState:{addEventListener:(_,cb)=>{listener=cb;return{remove(){}};}}},
    '../api/native':{nativeApiBase:v=>v||''},
    '../api/transport':{accountFetch:()=>{throw new Error('No actual network allowed');},clearNativeSession:async()=>{},nativeProfileAssets:async()=>({}),saveNativeProfileAssets:async()=>({}),lockNativeAccess:async()=>{},prepareNativeOnline:async()=>{},unlockNativeOffline:async()=>{throw new Error('No offline fixture');},cacheNativeSnapshot:async()=>{},validateNativeOffline:async()=>{},revokeNativeOffline:async()=>{}},
    '../storage/local':{localStorage:()=>({getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)})},
    '../api/client':{ApiClient:Client,ApiError},'../api/account':{AccountRepository:Repository,toItem:v=>v},
    '../api/library':{HOME:'home',libraryPages:async()=>[],libraryPhoto:v=>v,applyPlacements:v=>v},'../api/importLocal':{},'../storage/browser':{browserStorage:()=>null},
  };
  const module={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../src/state/Account.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)(id=>{assert.ok(id in dependencies,id);return dependencies[id];},module,module.exports);
  function render(){cursor=0;const node=module.exports.AccountProvider({children:null});while(effects.length)effects.shift()();return node.props.value;}
  try{
    let account=render();account=render();assert.equal(account.ready,true);assert.deepEqual(requests,[]);
    await account.resume();account=render();assert.equal(account.nativeVerified,true);
    let release;waitForMe=new Promise(resolve=>{release=resolve;});const pending=account.refresh();account=render();assert.equal(account.loading,true);
    const before=requests.length;listener('background');account=render();assert.equal(account.nativeVerified,false);assert.equal(account.loading,false);assert.equal(account.user,null);
    listener('active');account=render();assert.equal(account.nativeVerified,false);assert.equal(requests.length,before);
    release(me);await pending;account=render();assert.equal(account.loading,false);assert.equal(account.nativeVerified,false);assert.equal(requests.length,before,'late verification must not fetch profile/content');
    assert.equal(storage.get('bubble.items.v1'),'retained legacy fixture');
  }finally{for(const c of cells)c?.cleanup?.();}
});
