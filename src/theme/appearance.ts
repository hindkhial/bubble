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
export type ThemeColors = { [Key in keyof typeof colors]: string } & { input: string; onAction: string; destructive: string };

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
    destructive: dark ? '#F0A8BC' : '#9C3F55',
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

export const bubblePalette = [
  { name: 'Medium', value: colors.lavender },
  { name: 'Light', value: colors.lavenderSoft },
  { name: 'Deep', value: colors.lavenderDeep },
] as const;

// Keep the stored shade keys compatible with existing Bubbles while rendering
// each shade in the current app accent instead of permanently storing purple.
export function bubbleShade(value: string, mode: AppearanceMode, accentName: AccentName): string {
  const accent = accentPalette.find(option => option.name === accentName) ?? accentPalette[0];
  const base = mode === 'dark' ? accent.dark : accent.value;
  const index = bubblePalette.findIndex(option => option.value === value);
  if (index < 0) return themedAvatarColor(value, mode);
  if (index === 0) return base;
  const target = index === 1 ? 255 : 0;
  const amount = mode === 'dark' ? (index === 1 ? 0.06 : 0.15) : (index === 1 ? 0.4 : 0.08);
  return '#' + base.slice(1).match(/../g)!.map(channel =>
    Math.round(parseInt(channel, 16) * (1 - amount) + target * amount).toString(16).padStart(2, '0')
  ).join('');
}
