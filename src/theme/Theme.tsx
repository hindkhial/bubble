import { useLocalState } from '../storage/useLocalState';
import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { getThemeColors, type AccentName, type AppearanceMode } from './appearance';

function useAppearanceState() {
  const [mode, setMode, modeError] = useLocalState<AppearanceMode>('bubble.mode.v1', () => 'light', (value): value is AppearanceMode => value === 'light' || value === 'dark');
  const [accent, setAccent, accentError] = useLocalState<AccentName>('bubble.accent.v1', () => 'Lavender', (value): value is AccentName => ['Lavender', 'Rose', 'Sage', 'Deep lavender', 'Sky blue', 'Dusty pink', 'Denim blue'].includes(String(value)));
  const colors = useMemo(() => getThemeColors(mode, accent), [mode, accent]);
  return { storageError: modeError || accentError, mode, setMode, accent, setAccent, colors };
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
