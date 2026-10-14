import { colors } from './tokens.ts';

export const accentPalette = [
  { name: 'Lavender', value: colors.lavenderSoft, dark: '#392D49', ink: '#6E557C', bright: '#DDC7F0' },
  { name: 'Rose', value: colors.rose, dark: '#482E3A', ink: '#805366', bright: '#EDBDCF' },
  { name: 'Sage', value: colors.sage, dark: '#2D4035', ink: '#426850', bright: '#BDDCC6' },
  { name: 'Deep lavender', value: colors.lavenderDeep, dark: '#463254', ink: '#694779', bright: '#DCC0ED' },
  { name: 'Sky blue', value: colors.blueSoft, dark: '#293C50', ink: '#3E6082', bright: '#B7D7F5' },
  { name: 'Dusty pink', value: colors.pinkDeep, dark: '#542F42', ink: '#602B42', bright: '#F1B2D0' },
  { name: 'Denim blue', value: colors.blueDeep, dark: '#2D4560', ink: '#294867', bright: '#B0D2F4' },
] as const;
export type AppearanceMode = 'light' | 'dark';
export type AccentName = typeof accentPalette[number]['name'];
export type ThemeColors = { [Key in keyof typeof colors]: string } & { input: string; onAction: string };

export function getThemeColors(mode: AppearanceMode, accentName: AccentName): ThemeColors {
  const accent = accentPalette.find((option) => option.name === accentName) ?? accentPalette[0];
  const dark = mode === 'dark';
  return {
    ...colors,
    background: dark ? '#1D1A21' : colors.background,
    surface: dark ? '#29252E' : colors.surface,
    text: dark ? '#F4EEF7' : colors.text,
    muted: dark ? '#BDB1C5' : colors.muted,
    border: dark ? '#4A414F' : colors.border,
    input: dark ? '#332D3A' : colors.white,
    onAction: dark ? '#211A28' : colors.white,
    lavender: dark ? accent.dark : accent.value,
    lavenderSoft: dark ? accent.dark : accent.value,
    lavenderDeep: dark ? accent.dark : accent.value,
    action: dark ? accent.bright : accent.ink,
    rose: dark ? accentPalette[1].dark : colors.rose,
    sage: dark ? accentPalette[2].dark : colors.sage,
    blueSoft: dark ? accentPalette[4].dark : colors.blueSoft,
    pinkDeep: dark ? accentPalette[5].dark : colors.pinkDeep,
    blueDeep: dark ? accentPalette[6].dark : colors.blueDeep,
  };
}

export function themedAvatarColor(value: string, mode: AppearanceMode) {
  return mode === 'dark' ? (value === colors.lavender ? accentPalette[0].dark : accentPalette.find((option) => option.value === value)?.dark) ?? value : value;
}
