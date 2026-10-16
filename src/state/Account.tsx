import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { ApiClient, ApiError } from '../api/client';
import { AccountRepository, type Account, type Preferences, type ServerProfile } from '../api/account';
import type { SampleItem } from '../data/sample';
import { copyLocalItems } from '../api/importLocal';
import { browserStorage, type ClientStorage } from '../storage/browser';
const MODE_KEY = 'bubble.workspace.v1';
export function configuredApi() { return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080'; }
function useAccountState() {
  const repository = useMemo(() => new AccountRepository(new ApiClient(configuredApi())), []);
  const [mode, setMode] = useState<'local' | 'account'>('local');
  const [ready,setReady] = useState(false);
  const [user,setUser] = useState<Account | null>(null);
  const [profile,setProfile] = useState<ServerProfile | null>(null);
  const [preferences,setPreferences] = useState<Preferences | null>(null);
  const [items,setItems] = useState<SampleItem[]>([]);
  const [pins,setPins] = useState<string[]>([]);
  const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [blocked,setBlocked] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const clear = () => { setUser(null);setProfile(null);setPreferences(null);setItems([]);setPins([]); };
  const remember = (next: 'local' | 'account') => { try { browserStorage()?.setItem(MODE_KEY,next); } catch { /* Mode is session-only when browser storage is blocked. */ } setMode(next); };
  const fail = (value: unknown) => {
    const problem = value instanceof Error ? value : new Error('The request could not be completed.');
    if (value instanceof ApiError && value.status === 401) { generation.current++;clear();setBlocked(false);setLoading(false); }
    if (value instanceof ApiError && value.uncertain) setBlocked(true);
    setError(problem.message);return problem;
  };
  const refresh = async () => {
    const ticket = ++generation.current;setLoading(true);setError('');
    try {
      const me = await repository.me();
      const [accountProfile,accountPreferences,content] = await Promise.all([
        repository.api.request<ServerProfile>('GET','/profile'),repository.api.request<Preferences>('GET','/preferences'),repository.content(),
      ]);
      if (ticket !== generation.current) return;
      setUser(me);setProfile(accountProfile);setPreferences(accountPreferences);setItems(content.items);setPins(content.pinned);setBlocked(false);
    } catch (problem) { if(ticket === generation.current) fail(problem); }
    finally { if(ticket === generation.current || !user) setLoading(false); }
  };
  useEffect(() => {
    let saved = 'local';try { saved = browserStorage()?.getItem(MODE_KEY) || 'local'; } catch { /* Local-only remains available. */ }
    if (saved === 'account' && Platform.OS === 'web') { setMode('account');void refresh().finally(() => setReady(true)); }
    else setReady(true);
    return () => { generation.current++; };
  }, []);
  const local = () => { if(inFlight.current)return;generation.current++;remember('local');clear();setLoading(false);setError('');setBlocked(false); };
  const signIn = async (email: string,password: string) => {
    if(Platform.OS !== 'web')throw new Error('Account mode is currently available in the browser.');
    await repository.login(email,password);remember('account');await refresh();
  };
  const resume = async () => {if(Platform.OS!=='web')throw new Error('Account mode is browser-only.');remember('account');await refresh();};
  const register = async (email: string,password: string,name: string) => { await repository.register(email,password,name); };
  const logout = async () => {
    if(inFlight.current)return;
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
  const savedItem = (value: SampleItem) => setItems(current => [...current.filter(item => item.id !== value.id),value]);
  const saveNote = (input: {title: string;body: string},id?: string) => act(()=>repository.saveNote(input,id),savedItem);
  const saveChecklist = (input: {title: string;rows: import('../data/sample').ChecklistRow[]},id?: string) => act(()=>repository.saveChecklist(input,id),savedItem);
  const remove = (item: SampleItem) => act(()=>repository.api.request<void>('DELETE',`/${item.type === 'CHECKLIST' ? 'checklists' : 'notes'}/${item.id}`),()=>{setItems(current=>current.filter(value=>value.id!==item.id));setPins(current=>current.filter(id=>id!==item.id));});
  const pin = (item: SampleItem) => act(()=>repository.api.request('PATCH',`/${item.type === 'CHECKLIST' ? 'checklists' : 'notes'}/${item.id}`,{pinned:!pins.includes(item.id)}),()=>setPins(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id]));
  const patchProfile = (input: {displayName?: string;bio?: string | null;avatarReference?: string | null}) => act(()=>repository.api.request<ServerProfile>('PATCH','/profile',input),setProfile);
  const patchPreferences = (input: Partial<Preferences>) => act(()=>repository.api.request<Preferences>('PATCH','/preferences',input),setPreferences);
  const importSelected = (storage: ClientStorage, selected: SampleItem[]) => act(()=>copyLocalItems(repository,storage,user!.id,selected),()=>{}).finally(()=>{void refresh();});
  return {resume,reportError:fail,importSelected,mode,ready,user,profile,preferences,items,pins,loading,busy,error,blocked,repository,refresh,local,signIn,register,logout,saveNote,saveChecklist,remove,pin,patchProfile,patchPreferences,setError};
}
const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(null);
export function AccountProvider({children}: PropsWithChildren) { const value=useAccountState();return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>; }
export function useAccount() {const value=useContext(AccountContext);if(!value)throw new Error('AccountProvider missing');return value;}
