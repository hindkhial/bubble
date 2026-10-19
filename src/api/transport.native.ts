import { requireOptionalNativeModule } from 'expo';
import { nativeApiBase } from './native';
export type NativeProfileAssets = {avatarColor?:string;avatarEmoji?:string;imageUri?:string};
type Transport = {
  assets():Promise<NativeProfileAssets>;
  saveAssets(color:string,emoji:string,image:string|null):Promise<NativeProfileAssets>;
  request(base: string, path: string, method: string, body: string | null, csrf: string | null): Promise<{status: number;body: string;privateGate?:boolean}>;
  clear(base: string): Promise<void>;
  setGate(base: string, username: string, password: string): Promise<void>;
};
const bridge = requireOptionalNativeModule<Transport>('BubbleSession');
export const nativeTransportAvailable = !!bridge;
export const accountFetch: typeof fetch = async (input, init = {}) => {
  if (!bridge) throw new Error('Install the updated native build to use accounts.');
  const url = new URL(String(input));
  const base = nativeApiBase(url.origin);
  if (!url.pathname.startsWith('/api/v1/') || url.username || url.password || url.hash) throw new Error('Invalid account request.');
  if (init.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
  const headers = new Headers(init.headers);
  const result = await bridge.request(base, url.pathname + url.search, init.method ?? 'GET', typeof init.body === 'string' ? init.body : null, headers.get('X-CSRF-TOKEN'));
  if (init.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
  return new Response(result.status === 204 ? null : result.body, {status:result.status,headers:{'Content-Type':'application/json',...(result.privateGate?{'WWW-Authenticate':'Basic'}:{})}});
};
export async function clearNativeSession(base: string) {
  if (!bridge) throw new Error('Native session transport is unavailable.');
  await bridge.clear(nativeApiBase(base));
}
export async function setPrivateBetaAccess(base: string, username: string, password: string) {
  if (!bridge) throw new Error('Install the updated native build to use accounts.');
  await bridge.setGate(nativeApiBase(base), username, password);
}

export async function nativeProfileAssets(){if(!bridge)throw new Error('Native session transport is unavailable.');return bridge.assets();}
export async function saveNativeProfileAssets(color:string,emoji:string,image?:string){if(!bridge)throw new Error('Native session transport is unavailable.');return bridge.saveAssets(color,emoji,image??null);}
