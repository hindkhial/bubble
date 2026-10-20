export const accountFetch: typeof fetch = (...args) => fetch(...args);
export const nativeTransportAvailable = true;
export async function clearNativeSession(_base: string) {}
export async function setPrivateBetaAccess(_base: string, _username: string, _password: string) {}

export type NativeProfileAssets = {avatarColor?:string;avatarEmoji?:string;imageUri?:string};
export async function nativeProfileAssets():Promise<NativeProfileAssets>{return {};}
export async function saveNativeProfileAssets(_color:string,_emoji:string,_image?:string):Promise<NativeProfileAssets>{return {};}
import type { OfflineSnapshot, ProtectedDraft } from './offline';
export async function lockNativeAccess(){}
export async function validateNativeOffline(){}
export async function revokeNativeOffline(_base:string){}
export async function prepareNativeOnline(){}
export async function unlockNativeOffline(_base:string):Promise<OfflineSnapshot>{throw new Error('Offline account access is available only in the updated iPhone app.');}
export async function cacheNativeSnapshot(_base:string,_snapshot:OfflineSnapshot){}
export async function saveProtectedDraft(_base:string,_owner:string,_draft:ProtectedDraft){}
export async function protectedDrafts(_base:string,_owner:string):Promise<ProtectedDraft[]>{return [];}
export async function removeProtectedDraft(_base:string,_owner:string,_id:string){}
