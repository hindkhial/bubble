import { BubbleLogo } from "../../components/BubbleLogo";
import { DeviceContentNotice } from '../../components/DeviceContentNotice';
import { useAccount } from '../../state/Account';
import { usePins } from '../../state/Pins';
import { searchEverything } from '../../utils/dashboard';
import { useTheme } from '../../theme/Theme';
import type { ThemeColors } from '../../theme/appearance';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../../components/BottomNavigation';
import { CollectionGrid } from '../../components/CollectionGrid';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { useContent } from '../../state/Content';
import { useProfile } from '../../state/Profile';
import type { CollectionEntry } from '../../data/sample';
import { spacing } from '../../theme/tokens';

export default function HomeScreen() {
  const account=useAccount();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { childBubbles, items, bubbles, storageError } = useContent();
  const { profile } = useProfile();
  const { pinsFor, storageError: pinError } = usePins();
  const pinKeys = new Set([...pinsFor('root'),...bubbles.flatMap((bubble) => pinsFor(bubble.id))]);
  const pinned = searchEverything(bubbles,items,'','All',pinKeys).filter(entry=>pinKeys.has(`${entry.kind}:${entry.value.id}`));
  const rootBubbles = childBubbles(null);
  const entries: CollectionEntry[] = [...rootBubbles.map((value):CollectionEntry => ({kind:'bubble',value})),...items.filter(item=>item.bubbleId==='root'||item.bubbleId==='account-library').map((value):CollectionEntry=>({kind:'file',value}))];
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View style={styles.logo}><BubbleLogo /></View>
          <Text style={styles.brand}>bubble</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/you')} style={styles.avatarButton}><ProfileAvatar profile={profile} size={42} /></Pressable>
        </View>

        <Text style={styles.heading} numberOfLines={2}>Welcome back, {profile.displayName.trim() || 'friend'}.</Text>
        <Text style={styles.intro}>Your thoughts and favorite things, all in one place.</Text>

        {storageError || pinError ? <Text accessibilityRole="alert" style={[styles.intro, { color: colors.text }]}>{storageError || pinError}</Text> : null}
        <DeviceContentNotice/>
        <Text accessibilityRole="header" style={styles.dashboardTitle}>Pinned</Text>
        {pinned.length ? <CollectionGrid entries={pinned} scopeId="root" respectEntryScopes /> : <Text style={styles.sectionSubtitle}>Keep favorites close. Pin something from its options.</Text>}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Your space</Text>
            <Text style={styles.sectionSubtitle}>Bubbles and the things you keep on Home.</Text>
          </View>
          <Text style={styles.sectionCount}>{entries.length}</Text>
        </View>
        {entries.length ? <CollectionGrid entries={entries} scopeId="root" /> : <View style={styles.empty}><Text style={styles.emptyIcon}>✧</Text><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Add a thought, photo, or Bubble to get started.</Text></View>}
        <Text style={styles.demo}>{account.mode==='account'?'Account mode · connection required · local notes stay separate':Platform.OS === 'web' ? 'Stored in this browser · Search stays on your device.' : 'Stored on this iPhone · Search stays on your device.'}</Text>
      </ScrollView>
      <BottomNavigation active="home" />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  dashboardTitle: { color: colors.text, fontSize: 21, fontWeight: '700', marginTop: 22, marginBottom: 14 },
  content: { paddingHorizontal: spacing.page, paddingBottom: 28 },
  topline: { height: 52, flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  logo: { width: 33, height: 32, marginRight: 7 },
  brand: { color: colors.text, fontWeight: '800', fontSize: 23, letterSpacing: -1 },
  avatarButton: { marginLeft: 'auto', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, marginBottom: 25, maxWidth: 340 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  sectionCount: { color: colors.action, backgroundColor: colors.lavender, overflow: 'hidden', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '700' },
  demo: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 25 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { color: colors.action, fontSize: 34, marginBottom: 6 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 5 },
});
