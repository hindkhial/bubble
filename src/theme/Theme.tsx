import { useAccount } from '../state/Account';
import { useColorScheme } from 'react-native';
import { useLocalState } from '../storage/useLocalState';
import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { getThemeColors, type AccentName, type AppearanceMode } from './appearance';

function useAppearanceState() {
  const [localMode, setLocalMode, modeError] = useLocalState<AppearanceMode>('bubble.mode.v1', () => 'light', (value): value is AppearanceMode => value === 'light' || value === 'dark');
  const [localAccent, setLocalAccent, accentError] = useLocalState<AccentName>('bubble.accent.v1', () => 'Lavender', (value): value is AccentName => ['Lavender', 'Rose', 'Sage', 'Deep lavender', 'Sky blue', 'Dusty pink', 'Denim blue'].includes(String(value)));
  const account=useAccount();const system=useColorScheme();
  const remote=account.mode==='account';
  const selectedMode = remote ? (account.preferences?.themeMode ?? 'LIGHT').toLowerCase() as 'light'|'dark'|'system' : localMode;
  const mode: AppearanceMode = selectedMode==='system' ? system==='dark'?'dark':'light' : selectedMode;
  const accent = remote ? (account.preferences?.accentColor ?? 'Lavender') as AccentName : localAccent;
  const setMode = (next: 'light'|'dark'|'system') => { if(remote)void account.patchPreferences({themeMode:next.toUpperCase() as 'LIGHT'|'DARK'|'SYSTEM'}).catch(()=>{});else if(next!=='system')setLocalMode(next); };
  const setAccent = (next: AccentName) => {if(remote)void account.patchPreferences({accentColor:next}).catch(()=>{});else setLocalAccent(next);};
  const colors = useMemo(() => getThemeColors(mode, accent), [mode, accent]);
  return { storageError: remote ? account.error : modeError || accentError, selectedMode, mode, setMode, accent, setAccent, colors };
}
const ThemeContext = createContext<ReturnType<typeof useAppearanceState> | null>(null);
export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useAppearanceState();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
