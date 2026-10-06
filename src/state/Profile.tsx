import { createContext, useContext, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { colors } from '../theme/tokens';

export type Profile = { displayName: string; avatarColor: string };

const ProfileContext = createContext<{ profile: Profile; updateProfile: (profile: Profile) => void } | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, updateProfile] = useState<Profile>({ displayName: 'Bubble', avatarColor: colors.lavenderSoft });
  return <ProfileContext.Provider value={{ profile, updateProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
