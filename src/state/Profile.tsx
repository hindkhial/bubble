import { Platform } from 'react-native';
import { profileChanges } from '../api/account';
import { useAccount } from './Account';
import { persistProfilePhoto, profilePhotoUri } from '../storage/profilePhoto';
import { useLocalState } from '../storage/useLocalState';
import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { colors } from '../theme/tokens';

export type Profile = { displayName: string; avatarColor: string; bio: string; imageUri?: string; avatarEmoji?: string; avatarReference?: string | null };

const ProfileContext = createContext<{ profile: Profile; storageError: string | null; updateProfile: (profile: Profile) => void | Promise<unknown> } | null>(null);

export function ProfileProvider({children}: PropsWithChildren) {
  const account=useAccount();
  if(account.mode==='account'){
    const assets=Platform.OS==='ios'?account.profileAssets:{};
    return <ProfileContext.Provider value={{
      profile:{displayName:account.profile?.displayName??'Your account',bio:account.profile?.bio??'',avatarColor:assets.avatarColor??colors.lavenderSoft,avatarEmoji:assets.avatarEmoji,imageUri:assets.imageUri,avatarReference:account.profile?.avatarReference??null},
      storageError:account.error||null,
      updateProfile:async profile=>{
        if(!account.profile)throw new Error('Load your account profile first.');
        const changes=profileChanges(account.profile,profile);
        if(Object.keys(changes).length)await account.patchProfile(changes);
        if(Platform.OS==='ios')await account.patchProfileAssets(profile);
      }
    }}>{children}</ProfileContext.Provider>;
  }
  return <LocalProfile>{children}</LocalProfile>;
}
function LocalProfile({ children }: PropsWithChildren) {
  const [profile, , storageError, , commitProfile] = useLocalState<Profile>('bubble.profile.v1', () => ({ displayName: 'Bubble', avatarColor: colors.lavenderSoft, bio: '' }), (value): value is Profile => !!value && typeof value === 'object' && 'displayName' in value && typeof value.displayName === 'string' && 'avatarColor' in value && typeof value.avatarColor === 'string' && 'bio' in value && typeof value.bio === 'string' && (!('imageUri' in value) || value.imageUri === undefined || typeof value.imageUri === 'string') && (!('avatarEmoji' in value) || value.avatarEmoji === undefined || typeof value.avatarEmoji === 'string') && (!('avatarReference' in value) || value.avatarReference == null || typeof value.avatarReference === 'string'));
  const resolvedImage = profilePhotoUri(profile.imageUri);
  const photoError = profile.imageUri && !resolvedImage ? 'Your saved photo is unavailable. Choose it again; your profile data is unchanged.' : null;
  return <ProfileContext.Provider value={{ profile: { ...profile, imageUri: resolvedImage }, updateProfile: next => persistProfilePhoto(profile.imageUri, next.imageUri, reference => commitProfile({ ...next, imageUri: reference })), storageError: storageError || photoError }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
