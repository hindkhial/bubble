import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { nativeApiBase } from '../api/native';
import { AppState, Platform } from 'react-native';
import { accountFetch, clearNativeSession, nativeProfileAssets, saveNativeProfileAssets, type NativeProfileAssets } from '../api/transport';
import { localStorage } from '../storage/local';
import { ApiClient, ApiError } from '../api/client';
import { toItem, AccountRepository, type Account, type Preferences, type ServerProfile } from '../api/account';
import { HOME, libraryPages, libraryPhoto, applyPlacements, type LibraryEntry, type Placement } from '../api/library';
import type { SampleItem } from '../data/sample';
import { copyLocalItems, verifyAccountCopy } from '../api/importLocal';
import { browserStorage, type ClientStorage } from '../storage/browser';
const MODE_KEY = 'bubble.workspace.v1';
export function configuredApi() {
  if (Platform.OS === 'web') return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
  try { return nativeApiBase(process.env.EXPO_PUBLIC_API_URL); } catch { return ''; }
}
function useAccountState() {
  const repository = useMemo(() => new AccountRepository(new ApiClient(configuredApi(), accountFetch)), []);
  const [mode, setMode] = useState<'local' | 'account'>('local');
  const [ready,setReady] = useState(false);
  const [nativeVerified,setNativeVerified] = useState(false);
  const [verificationRevision,setVerificationRevision] = useState(0);
  const [profileAssets,setProfileAssets] = useState<NativeProfileAssets>({});
  const authPending = useRef(false);
  const [user,setUser] = useState<Account | null>(null);
  const [profile,setProfile] = useState<ServerProfile | null>(null);
  const [preferences,setPreferences] = useState<Preferences | null>(null);
  const [items,setItems] = useState<SampleItem[]>([]);
  const [library,setLibrary] = useState<LibraryEntry[]>([]);
  const [pins,setPins] = useState<string[]>([]);
  const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [blocked,setBlocked] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const clear = useCallback(() => { setUser(null);setProfile(null);setPreferences(null);setItems([]);setLibrary([]);setPins([]);setProfileAssets({}); },[]);
  const remember = (next: 'local' | 'account') => { try { browserStorage()?.setItem(MODE_KEY,next); } catch { /* Mode is session-only when browser storage is blocked. */ } setMode(next); };
  const fail = (value: unknown) => {
    const problem = value instanceof Error ? value : new Error('The request could not be completed.');
    if (value instanceof ApiError && value.status === 401) { generation.current++;setNativeVerified(false);clear();setBlocked(false);setLoading(false); }
    if (value instanceof ApiError && value.uncertain) setBlocked(true);
    setError(problem.message);return problem;
  };
  const refresh = async () => {
    const ticket = ++generation.current;setLoading(true);setError('');
    try {
      const me = await repository.me();
      const [accountProfile,accountPreferences,content,entries,placements] = await Promise.all([
        repository.api.request<ServerProfile>('GET','/profile'),repository.api.request<Preferences>('GET','/preferences'),repository.content(),
        libraryPages<LibraryEntry>(repository.api,'/library'),libraryPages<Placement>(repository.api,'/library/placements'),
      ]);
      const assets=Platform.OS==='ios'?await nativeProfileAssets():{};
      if (ticket !== generation.current) return false;
      setUser(me);setProfile(accountProfile);setPreferences(accountPreferences);
      setItems([...applyPlacements(content.items,placements),...entries.filter(entry=>entry.kind==='PHOTO').map(libraryPhoto)]);
      setLibrary(entries);setPins([...content.pinned,...entries.filter(entry=>entry.pinned).map(entry=>entry.id)]);setProfileAssets(assets);setBlocked(false);
      if(Platform.OS==='ios'){localStorage()?.setItem('bubble.auth.locked.v1','false');setMode('account');setVerificationRevision(value=>value+1);setNativeVerified(true);}
      return true;
    } catch (problem) { if(ticket === generation.current) fail(problem);return false; }
    finally { if(ticket === generation.current || !user) setLoading(false); }
  };
  useEffect(() => {
    if(Platform.OS==='ios'){
      try {
        if(configuredApi() && localStorage()?.getItem('bubble.auth.locked.v1')!=='true')void refresh().finally(()=>setReady(true));
        else setReady(true);
      }catch{setError('Device storage is unavailable. Existing data is unchanged.');setReady(true);}
      let backgrounded=false;
      const listener=AppState.addEventListener('change',state=>{
        if(state==='background')backgrounded=true;
        if(state==='active'&&backgrounded){
          backgrounded=false;
          setNativeVerified(false);clear();
          if(authPending.current||inFlight.current)return;
          try{if(localStorage()?.getItem('bubble.auth.locked.v1')!=='true')void refresh();}catch{setError('Device storage is unavailable.');}
        }
      });
      return ()=>{generation.current++;listener.remove();};
    }
    let saved = 'local';try { saved = browserStorage()?.getItem(MODE_KEY) || 'local'; } catch { /* Local-only remains available. */ }
    if (saved === 'account' && Platform.OS === 'web') { setMode('account');void refresh().finally(() => setReady(true)); }
    else setReady(true);
    return () => { generation.current++; };
  }, []);
  useEffect(()=>{
    if(Platform.OS!=='ios'||!nativeVerified)return;
    const timer=setTimeout(()=>{generation.current++;setNativeVerified(false);clear();setError('Please verify your session online again. Saved account content remains on the server.');},15*60*1000);
    return ()=>clearTimeout(timer);
  },[nativeVerified,verificationRevision,clear]);
  const local = () => { if(Platform.OS==='ios'){setNativeVerified(false);clear();return;}if(inFlight.current)return;generation.current++;remember('local');clear();setLoading(false);setError('');setBlocked(false); };
  const signIn = async (email: string,password: string) => {
    if(Platform.OS==='android')throw new Error('Account mode is not available on Android.');
    if(inFlight.current)throw new Error('Wait for the previous account change to finish before signing in.');
    if(authPending.current)throw new Error('A sign-in request is already running.');
    authPending.current=true;
    try{
      await repository.login(email.trim().toLowerCase(),password);
      if(Platform.OS==='web')remember('account');
      if(!await refresh())throw new Error('Could not verify your account. Check the connection and try again.');
    }finally{authPending.current=false;}
  };
  const resume = async () => {if(Platform.OS==='android')throw new Error('Account mode is not available on Android.');if(Platform.OS==='ios'&&localStorage()?.getItem('bubble.auth.locked.v1')==='true')throw new Error('Please log in again after signing out.');if(Platform.OS==='web')remember('account');await refresh();};
  const register = async (email: string,password: string,name: string) => { if(inFlight.current)throw new Error('Wait for the previous account change to finish.');await repository.register(email,password,name); };
  const logout = async () => {
    if(inFlight.current)return;
    if(Platform.OS==='ios'){
      // Persist the non-secret lock before network work; a failed logout never auto-restores.
      localStorage()?.setItem('bubble.auth.locked.v1','true');
      generation.current++;setNativeVerified(false);clear();repository.api.resetCsrf();
      try{await repository.logout();}finally{await clearNativeSession(configuredApi());}
      return;
    }
    try { await repository.logout();local(); } catch(problem) { throw fail(problem); }
  };
  const act = async <T,>(operation: () => Promise<T>, apply: (value: T) => void): Promise<T> => {
    if(!user || mode !== 'account')throw new Error('Sign in to use your account.');
    if(inFlight.current || blocked || loading){const message='Refresh your account before making another change.';setError(message);throw new Error(message);}
    inFlight.current = true;setBusy(true);setError('');const ticket = generation.current;
    try { const value=await operation();if(ticket !== generation.current)throw new Error('Your workspace changed. Refresh to confirm this change.');apply(value);return value; }
    catch(problem) { throw fail(problem); }
    finally { inFlight.current=false;setBusy(false); }
  };
  const savedItem = (value: SampleItem) => setItems(current => [...current.filter(item => item.id !== value.id),{...value,bubbleId:current.find(item=>item.id===value.id)?.bubbleId??value.bubbleId}]);
  const saveNote = (input: {title:string;body:string;bubbleId?:string},id?:string) => act(async()=>{
    if(id)return repository.saveNote(input,id);
    const value=await repository.api.request<import('../api/account').ServerItem>('POST','/library/notes',{note:{title:input.title.trim()||'Untitled note',content:input.body},bubbleId:input.bubbleId&&input.bubbleId!==HOME?input.bubbleId:null});
    return {...toItem(value),bubbleId:input.bubbleId??HOME};
  },savedItem);
  const saveChecklist = (input: {title:string;rows:import('../data/sample').ChecklistRow[];bubbleId?:string},id?:string) => act(async()=>{
    if(id)return repository.saveChecklist(input,id);
    const items=input.rows.filter(row=>row.text.trim()).map(row=>({id:null,content:row.text,completed:row.done}));
    const value=await repository.api.request<import('../api/account').ServerItem>('POST','/library/checklists',{checklist:{title:input.title.trim()||'Untitled checklist',items},bubbleId:input.bubbleId&&input.bubbleId!==HOME?input.bubbleId:null});
    return {...toItem(value,true),bubbleId:input.bubbleId??HOME};
  },savedItem);
  const remove = (item: SampleItem) => act(()=>repository.api.request<void>('DELETE',`/${item.type==='PHOTO'?'library':item.type === 'CHECKLIST' ? 'checklists' : 'notes'}/${item.id}`),()=>{setItems(current=>current.filter(value=>value.id!==item.id));setLibrary(current=>current.filter(value=>value.id!==item.id));setPins(current=>current.filter(id=>id!==item.id));});
  const pin = (item: SampleItem) => act(()=>repository.api.request(item.type==='PHOTO'?'PUT':'PATCH',`/${item.type==='PHOTO'?'library':item.type === 'CHECKLIST' ? 'checklists' : 'notes'}/${item.id}${item.type==='PHOTO'?'/pin':''}`,{pinned:!pins.includes(item.id)}),()=>setPins(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id]));
  const patchProfile = (input: {displayName?: string;bio?: string | null;avatarReference?: string | null}) => act(()=>repository.api.request<ServerProfile>('PATCH','/profile',input),setProfile);
  const createLibrary = (input:{kind:'BUBBLE'|'PHOTO';title:string;description:string;parentId:string|null;color:string;image:string}) => act(()=>repository.api.request<LibraryEntry>('POST','/library',input),entry=>{setLibrary(current=>[...current,entry]);if(entry.kind==='PHOTO')savedItem(libraryPhoto(entry));});
  const updateLibrary = (id:string,input:{title:string;description:string;color:string}) => act(()=>repository.api.request<LibraryEntry>('PATCH','/library/'+id,input),entry=>{setLibrary(current=>current.map(value=>value.id===id?entry:value));if(entry.kind==='PHOTO')savedItem(libraryPhoto(entry));});
  const deleteLibrary = (id:string) => act(()=>repository.api.request<void>('DELETE','/library/'+id),()=>{
    setLibrary(current=>current.filter(entry=>entry.id!==id).map(entry=>entry.parentId===id?{...entry,parentId:null}:entry));
    setItems(current=>current.filter(item=>item.id!==id).map(item=>item.bubbleId===id?{...item,bubbleId:HOME}:item));setPins(current=>current.filter(value=>value!==id));
  });
  const pinBubble=(id:string)=>act(()=>repository.api.request<LibraryEntry>('PUT','/library/'+id+'/pin',{pinned:!pins.includes(id)}),entry=>{setLibrary(current=>current.map(value=>value.id===id?entry:value));setPins(current=>entry.pinned?[...current.filter(value=>value!==id),id]:current.filter(value=>value!==id));});
  const patchPreferences = (input: Partial<Preferences>) => act(()=>repository.api.request<Preferences>('PATCH','/preferences',input),setPreferences);
  const patchProfileAssets = (input:{avatarColor:string;avatarEmoji?:string;imageUri?:string}) => act(()=>saveNativeProfileAssets(input.avatarColor,input.avatarEmoji??'',input.imageUri),setProfileAssets);
  const importSelected = (storage: ClientStorage, selected: SampleItem[]) => act(()=>copyLocalItems(repository,storage,user!.id,selected,Platform.OS==='ios'?(id,item)=>verifyAccountCopy(repository,id,item):undefined),()=>{}).finally(()=>{void refresh();});
  return {library,createLibrary,updateLibrary,deleteLibrary,pinBubble,profileAssets,patchProfileAssets,nativeVerified,resume,reportError:fail,importSelected,mode,ready,user,profile,preferences,items,pins,loading,busy,error,blocked,repository,refresh,local,signIn,register,logout,saveNote,saveChecklist,remove,pin,patchProfile,patchPreferences,setError};
}
const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(null);
export function AccountProvider({children}: PropsWithChildren) { const value=useAccountState();return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>; }
export function useAccount() {const value=useContext(AccountContext);if(!value)throw new Error('AccountProvider missing');return value;}
