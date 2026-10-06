import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../components/BottomNavigation';
import { CollectionGrid } from '../components/CollectionGrid';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useContent } from '../state/Content';
import { useProfile } from '../state/Profile';
import type { CollectionEntry } from '../data/sample';
import { colors, spacing } from '../theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { childBubbles } = useContent();
  const { profile } = useProfile();
  const rootBubbles = childBubbles(null);
  const entries: CollectionEntry[] = rootBubbles.map((value) => ({ kind: 'bubble', value }));
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View style={styles.logo}><View style={styles.logoDotLeft} /><View style={styles.logoDotRight} /></View>
          <Text style={styles.brand}>bubble</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/you')} style={styles.avatarButton}><ProfileAvatar profile={profile} size={42} /></Pressable>
        </View>

        <Text style={styles.heading} numberOfLines={2}>Good morning, {profile.displayName}.</Text>
        <Text style={styles.intro}>Your thoughts and favorite things, all in one place.</Text>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Your Bubbles</Text>
            <Text style={styles.sectionSubtitle}>Little collections for everything.</Text>
          </View>
          <Text style={styles.sectionCount}>{rootBubbles.length}</Text>
        </View>
        {entries.length ? <CollectionGrid entries={entries} scopeId="root" /> : <View style={styles.empty}><Text style={styles.emptyIcon}>✧</Text><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Make a Bubble to keep your next thought.</Text></View>}
        <Text style={styles.demo}>Demo data · New entries reset when the app restarts.</Text>
      </ScrollView>
      <BottomNavigation active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.page, paddingBottom: 28 },
  topline: { height: 52, flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  logo: { width: 33, height: 32, marginRight: 7 },
  logoDotLeft: { position: 'absolute', left: 0, top: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.lavenderDeep },
  logoDotRight: { position: 'absolute', left: 12, top: 8, width: 21, height: 21, borderRadius: 11, backgroundColor: colors.lavender },
  brand: { color: colors.text, fontWeight: '800', fontSize: 23, letterSpacing: -1 },
  avatarButton: { marginLeft: 'auto', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, marginBottom: 25, maxWidth: 340 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  sectionCount: { color: colors.action, backgroundColor: colors.lavender, overflow: 'hidden', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '700' },
  demo: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 25 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { color: colors.action, fontSize: 34, marginBottom: 6 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 5 },
});
