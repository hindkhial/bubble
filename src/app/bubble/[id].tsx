import { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddPreview } from '../../components/AddPreview';
import { CollectionGrid } from '../../components/CollectionGrid';
import { CoverPhoto } from '../../components/CoverPhoto';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EditContentSheet } from '../../components/EditContentSheet';
import { ManagementMenu } from '../../components/ManagementMenu';
import { useContent } from '../../state/Content';
import { colors, spacing } from '../../theme/tokens';

export default function BubbleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bubbleById, bubbleCountLabel, collectionContents, updateBubble, deleteBubble } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const afterMenuCloses = (action: () => void) => {
    setMenuOpen(false);
    if (Platform.OS === 'web') action();
    else setTimeout(action, 350);
  };
  const bubble = bubbleById(id);

  if (!bubble) {
    return <Redirect href="/" />;
  }

  const contents = collectionContents(bubble.id);
  const parent = bubble.parentId ? bubbleById(bubble.parentId) : undefined;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{bubble.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${bubble.title} Bubble`} onPress={() => setMenuOpen(true)} style={styles.manageButton}><Text style={styles.manageText}>···</Text></Pressable>
        </View>
        <View style={styles.path}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')}><Text style={styles.pathText}>Home</Text></Pressable>
          {parent && <><Text style={styles.pathChevron}>›</Text><Pressable accessibilityRole="button" onPress={() => router.push(`/bubble/${parent.id}`)}><Text style={styles.pathText} numberOfLines={1}>{parent.title}</Text></Pressable></>}
          <Text style={styles.pathChevron}>›</Text><Text style={styles.pathCurrent} numberOfLines={1}>{bubble.title}</Text>
        </View>

        {bubble.cover ? <CoverPhoto source={bubble.cover} style={[styles.cover, { height: Math.min(150, width * 0.36) }]} /> : <View style={[styles.cover, styles.defaultCover, { height: Math.min(150, width * 0.36), backgroundColor: bubble.color ?? colors.lavender }]}><Text style={styles.defaultCoverIcon}>◌</Text></View>}
        <Text style={styles.title}>{bubble.title}</Text>
        <Text style={styles.description}>{bubble.description}</Text>
        <View style={styles.pills}><View style={styles.pill}><Text style={styles.pillText}>{bubbleCountLabel(bubble.id)}</Text></View></View>

        {contents.length > 0 ? <CollectionGrid entries={contents} scopeId={bubble.id} /> : (
          <View style={styles.empty}><Text style={styles.emptyIcon}>✧</Text><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>A little room for your next thought.</Text></View>
        )}
      </ScrollView>
      <View style={styles.bottom}><Text style={styles.sampleLabel}>Demo · resets on restart</Text><AddPreview parentId={bubble.id} /></View>
      <ManagementMenu visible={menuOpen} title={bubble.title} onClose={() => setMenuOpen(false)} onEdit={() => afterMenuCloses(() => setEditing(true))} onDelete={() => afterMenuCloses(() => setConfirmDelete(true))} />
      {editing && <EditContentSheet entry={bubble} onClose={() => setEditing(false)} onSave={(draft) => { updateBubble(bubble.id, draft); setEditing(false); }} />}
      <ConfirmDialog visible={confirmDelete} title={`Delete ${bubble.title}?`} message="This will delete this Bubble and everything inside it, including nested Bubbles and files. This cannot be undone." confirmLabel="Delete Bubble" onCancel={() => setConfirmDelete(false)} onConfirm={() => { const destination = bubble.parentId ? `/bubble/${bubble.parentId}` as const : '/' as const; setConfirmDelete(false); deleteBubble(bubble.id); router.replace(destination); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.page, paddingBottom: 28 },
  toolbar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', left: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  backArrow: { color: colors.text, fontSize: 35, lineHeight: 38, marginTop: -4 },
  toolbarTitle: { color: colors.text, fontSize: 16, fontWeight: '700', maxWidth: '65%' },
  manageButton: { position: 'absolute', right: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: colors.action, fontSize: 26, lineHeight: 27, fontWeight: '700', marginTop: -9 },
  path: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, marginBottom: 13, overflow: 'hidden' },
  pathText: { color: colors.muted, fontSize: 13 },
  pathChevron: { color: colors.muted, fontSize: 18 },
  pathCurrent: { color: colors.action, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  cover: { borderRadius: 27, marginBottom: 16, borderWidth: 1, borderColor: colors.white },
  defaultCover: { alignItems: 'center', justifyContent: 'center' },
  defaultCoverIcon: { color: colors.action, fontSize: 78, lineHeight: 90 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 4 },
  pills: { flexDirection: 'row', marginTop: 12, marginBottom: 19 },
  pill: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  pillText: { color: colors.action, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { color: colors.action, fontSize: 34, marginBottom: 6 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 5 },
  bottom: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, minHeight: 76, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sampleLabel: { color: colors.muted, fontSize: 13 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  backText: { color: colors.action, fontSize: 16, fontWeight: '700' },
});
