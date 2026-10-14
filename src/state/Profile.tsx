import { useLocalState } from '../storage/useLocalState';
import { createContext, useContext, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { colors } from '../theme/tokens';

export type Profile = { displayName: string; avatarColor: string; bio: string; imageUri?: string; avatarEmoji?: string };

const ProfileContext = createContext<{ profile: Profile; storageError: string | null; updateProfile: (profile: Profile) => void } | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, updateProfile, storageError] = useLocalState<Profile>('bubble.profile.v1', () => ({ displayName: 'Bubble', avatarColor: colors.lavenderSoft, bio: '' }), (value): value is Profile => !!value && typeof value === 'object' && 'displayName' in value && typeof value.displayName === 'string' && 'avatarColor' in value && typeof value.avatarColor === 'string' && 'bio' in value && typeof value.bio === 'string');
  return <ProfileContext.Provider value={{ profile, updateProfile, storageError }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
