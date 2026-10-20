import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AddPreview } from './AddPreview';

export function BottomNavigation({ active }: { active: 'home' | 'search' | 'you' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  return <View style={styles.bottomBar}>
    <Pressable accessibilityRole="button" accessibilityLabel="Home tab" accessibilityState={{ selected: active === 'home' }} {...(Platform.OS === 'web' ? { 'aria-current': active === 'home' ? 'page' as const : undefined } : {})} onPress={() => { if (active !== 'home') router.replace('/'); }} style={styles.tab}>
      <Text accessible={false} allowFontScaling={false} style={[styles.icon, active === 'home' && styles.active]}>⌂</Text><Text style={[styles.label, active === 'home' && styles.active]}>Home</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Search tab" accessibilityState={{ selected: active === 'search' }} {...(Platform.OS === 'web' ? { 'aria-current': active === 'search' ? 'page' as const : undefined } : {})} onPress={() => { if (active !== 'search') router.replace('/search'); }} style={styles.tab}><Text accessible={false} allowFontScaling={false} style={[styles.icon, active === 'search' && styles.active]}>⌕</Text><Text style={[styles.label, active === 'search' && styles.active]}>Search</Text></Pressable>
    <AddPreview />
    <Pressable accessibilityRole="button" accessibilityLabel="You tab" accessibilityState={{ selected: active === 'you' }} {...(Platform.OS === 'web' ? { 'aria-current': active === 'you' ? 'page' as const : undefined } : {})} onPress={() => { if (active !== 'you') router.replace('/you'); }} style={styles.tab}>
      <Text accessible={false} allowFontScaling={false} style={[styles.icon, active === 'you' && styles.active]}>◌</Text><Text style={[styles.label, active === 'you' && styles.active]}>You</Text>
    </Pressable>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, minHeight: 76, paddingHorizontal: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 48, paddingVertical: 8 },
  icon: { color: colors.muted, fontSize: 25, minHeight: 28 },
  label: { color: colors.muted, fontSize: 11, textAlign: 'center', flexShrink: 1 },
  active: { color: colors.action, fontWeight: '700' },
});
