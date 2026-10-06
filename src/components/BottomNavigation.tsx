import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { AddPreview } from './AddPreview';

export function BottomNavigation({ active }: { active: 'home' | 'you' }) {
  const router = useRouter();
  return <View style={styles.bottomBar}>
    <Pressable accessibilityRole="button" accessibilityLabel="Home tab" accessibilityState={{ selected: active === 'home' }} onPress={() => { if (active !== 'home') router.replace('/'); }} style={styles.tab}>
      <Text style={[styles.icon, active === 'home' && styles.active]}>⌂</Text><Text style={[styles.label, active === 'home' && styles.active]}>Home</Text>
    </Pressable>
    <View accessibilityLabel="Search, available in a later milestone" style={styles.tab}><Text style={styles.icon}>⌕</Text><Text style={styles.label}>Search</Text></View>
    <AddPreview />
    <Pressable accessibilityRole="button" accessibilityLabel="You tab" accessibilityState={{ selected: active === 'you' }} onPress={() => { if (active !== 'you') router.replace('/you'); }} style={styles.tab}>
      <Text style={[styles.icon, active === 'you' && styles.active]}>◌</Text><Text style={[styles.label, active === 'you' && styles.active]}>You</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, minHeight: 76, paddingHorizontal: 10 },
  tab: { alignItems: 'center', justifyContent: 'center', minWidth: 53, minHeight: 48 },
  icon: { color: colors.muted, fontSize: 25, height: 28 },
  label: { color: colors.muted, fontSize: 11 },
  active: { color: colors.action, fontWeight: '700' },
});
