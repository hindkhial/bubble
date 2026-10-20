import { requireOptionalNativeModule } from 'expo';
import { nativeApiBase } from './native';
export type NativeProfileAssets = {avatarColor?:string;avatarEmoji?:string;imageUri?:string};
type Transport = {
  lock():Promise<void>;
  validateOffline():Promise<void>;
  revokeOffline(base:string):Promise<void>;
  prepareOnline():Promise<void>;
  unlockOffline(base:string):Promise<string>;
  cacheSnapshot(base:string,json:string):Promise<void>;
  saveDraft(base:string,owner:string,id:string,json:string):Promise<void>;
  drafts(base:string,owner:string):Promise<string[]>;
  removeDraft(base:string,owner:string,id:string):Promise<void>;
  assets():Promise<NativeProfileAssets>;
  saveAssets(color:string,emoji:string,image:string|null):Promise<NativeProfileAssets>;
  request(base: string, path: string, method: string, body: string | null, csrf: string | null, expectedOwner: string | null): Promise<{status: number;body: string;privateGate?:boolean}>;
  clear(base: string): Promise<void>;
  setGate(base: string, username: string, password: string): Promise<void>;
};
const bridge = requireOptionalNativeModule<Transport>('BubbleSession');
import { parseSnapshot, parseDraft, type OfflineSnapshot, type ProtectedDraft } from './offline';
let networkLocked = true;
export async function lockNativeAccess(){networkLocked=true;await bridge?.lock?.();}
export async function validateNativeOffline(){if(!bridge)throw new Error('Native module unavailable.');await bridge.validateOffline();}
export async function revokeNativeOffline(base:string){if(!bridge)throw new Error('Native module unavailable.');await bridge.revokeOffline(nativeApiBase(base));}
export async function prepareNativeOnline(){networkLocked=true;if(!bridge?.prepareOnline)throw new Error('Install the updated native build.');await bridge.prepareOnline();networkLocked=false;}
export async function unlockNativeOffline(base:string){networkLocked=true;if(!bridge?.unlockOffline)throw new Error('Install the updated native build.');return parseSnapshot(await bridge.unlockOffline(nativeApiBase(base)));}
export async function cacheNativeSnapshot(base:string,snapshot:OfflineSnapshot){if(!bridge)throw new Error('Install the updated native build.');await bridge.cacheSnapshot(nativeApiBase(base),JSON.stringify(snapshot));}
export async function saveProtectedDraft(base:string,owner:string,draft:ProtectedDraft){if(!bridge)throw new Error('Install the updated native build.');await bridge.saveDraft(nativeApiBase(base),owner,draft.id,JSON.stringify(draft));}
export async function protectedDrafts(base:string,owner:string){if(!bridge)throw new Error('Install the updated native build.');return (await bridge.drafts(nativeApiBase(base),owner)).map(parseDraft);}
export async function removeProtectedDraft(base:string,owner:string,id:string){if(!bridge)throw new Error('Install the updated native build.');await bridge.removeDraft(nativeApiBase(base),owner,id);}
export const nativeTransportAvailable = !!bridge?.prepareOnline;
export const accountFetch: typeof fetch = async (input, init = {}) => {
  if(networkLocked)throw new Error('Online account access is locked. Verify online first.');
  if (!bridge) throw new Error('Install the updated native build to use accounts.');
  const url = new URL(String(input));
  const base = nativeApiBase(url.origin);
  if (!url.pathname.startsWith('/api/v1/') || url.username || url.password || url.hash) throw new Error('Invalid account request.');
  if (init.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
  const headers = new Headers(init.headers);
  const result = await bridge.request(base, url.pathname + url.search, init.method ?? 'GET', typeof init.body === 'string' ? init.body : null, headers.get('X-CSRF-TOKEN'), headers.get('X-Bubble-Expected-Owner'));
  if (init.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
  return new Response(result.status === 204 ? null : result.body, {status:result.status,headers:{'Content-Type':'application/json',...(result.privateGate?{'WWW-Authenticate':'Basic'}:{})}});
};
export async function clearNativeSession(base: string) {
  networkLocked=true;
  if (!bridge) throw new Error('Native session transport is unavailable.');
  await bridge.clear(nativeApiBase(base));
}
export async function setPrivateBetaAccess(base: string, username: string, password: string) {
  if (!bridge) throw new Error('Install the updated native build to use accounts.');
  await bridge.setGate(nativeApiBase(base), username, password);
}

export async function nativeProfileAssets(){if(!bridge)throw new Error('Native session transport is unavailable.');return bridge.assets();}
export async function saveNativeProfileAssets(color:string,emoji:string,image?:string){if(!bridge)throw new Error('Native session transport is unavailable.');return bridge.saveAssets(color,emoji,image??null);}
