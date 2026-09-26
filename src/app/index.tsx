import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddPreview } from '../components/AddPreview';
import { CollectionGrid } from '../components/CollectionGrid';
import { useContent } from '../state/Content';
import type { CollectionEntry } from '../data/sample';
import { colors, spacing } from '../theme/tokens';

export default function HomeScreen() {
  const { childBubbles } = useContent();
  const rootBubbles = childBubbles(null);
  const entries: CollectionEntry[] = rootBubbles.map((value) => ({ kind: 'bubble', value }));
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View style={styles.logo}><View style={styles.logoDotLeft} /><View style={styles.logoDotRight} /></View>
          <Text style={styles.brand}>bubble</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>B</Text></View>
        </View>

        <Text style={styles.heading}>Good morning.</Text>
        <Text style={styles.intro}>Your thoughts and favorite things, all in one place.</Text>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Your Bubbles</Text>
            <Text style={styles.sectionSubtitle}>Little collections for everything.</Text>
          </View>
          <Text style={styles.sectionCount}>{rootBubbles.length}</Text>
        </View>
        <CollectionGrid entries={entries} scopeId="root" />
        <Text style={styles.demo}>Demo data · New entries reset when the app restarts.</Text>
      </ScrollView>
      <View style={styles.bottomBar}>
        <View style={styles.tabActive}><Text style={styles.tabIcon}>⌂</Text><Text style={styles.tabActiveText}>Home</Text></View>
        <View accessibilityLabel="Search, available in a later milestone" style={styles.tab}><Text style={styles.tabIconMuted}>⌕</Text><Text style={styles.tabText}>Search</Text></View>
        <AddPreview />
        <View accessibilityLabel="You, available in a later milestone" style={styles.tab}><Text style={styles.tabIconMuted}>◌</Text><Text style={styles.tabText}>You</Text></View>
      </View>
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
  avatar: { marginLeft: 'auto', width: 42, height: 42, borderRadius: 21, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.action, fontSize: 17, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, marginBottom: 25, maxWidth: 340 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  sectionSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  sectionCount: { color: colors.action, backgroundColor: colors.lavender, overflow: 'hidden', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '700' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, minHeight: 76, paddingHorizontal: 10 },
  demo: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 25 },
  tabActive: { alignItems: 'center', minWidth: 53 },
  tab: { alignItems: 'center', minWidth: 53, opacity: 0.55 },
  tabIcon: { color: colors.action, fontSize: 25, height: 28 },
  tabIconMuted: { color: colors.muted, fontSize: 25, height: 28 },
  tabActiveText: { color: colors.action, fontSize: 11, fontWeight: '700' },
  tabText: { color: colors.muted, fontSize: 11 },
});
