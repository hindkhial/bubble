export const accountFetch: typeof fetch = (...args) => fetch(...args);
export const nativeTransportAvailable = true;
export async function clearNativeSession(_base: string) {}
export async function setPrivateBetaAccess(_base: string, _username: string, _password: string) {}

export type NativeProfileAssets = {avatarColor?:string;avatarEmoji?:string;imageUri?:string};
export async function nativeProfileAssets():Promise<NativeProfileAssets>{return {};}
export async function saveNativeProfileAssets(_color:string,_emoji:string,_image?:string):Promise<NativeProfileAssets>{return {};}
