import { useTheme } from '../../theme/Theme';
import type { ThemeColors } from '../../theme/appearance';
import { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EditContentSheet } from '../../components/EditContentSheet';
import { ManagementMenu } from '../../components/ManagementMenu';
import { checklistProgress } from '../../data/sample';
import { useContent } from '../../state/Content';
import { spacing } from '../../theme/tokens';

export default function FileDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { hydrated, storageError, bubbleById, itemById, updateNote, deleteNote, updateChecklist, toggleChecklistRow, deleteChecklist } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const afterMenuCloses = (action: () => void) => {
    setMenuOpen(false);
    if (Platform.OS === 'web') action();
    else setTimeout(action, 350);
  };
  const item = itemById(id);
  const bubble = item ? bubbleById(item.bubbleId) : undefined;

  if (!hydrated) return <SafeAreaView style={styles.screen}><ActivityIndicator accessibilityLabel="Loading saved content" /></SafeAreaView>;

  if (!item || !bubble) {
    if (storageError) return <SafeAreaView style={styles.screen}><Text accessibilityRole="alert" style={{ color: colors.text }}>{storageError}</Text><Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => router.replace('/')}><Text style={{ color: colors.action }}>Return home</Text></Pressable></SafeAreaView>;
    return <Redirect href="/" />;
  }
  const isChecklist = item.type === 'CHECKLIST';
  const manageable = item.type === 'NOTE' || isChecklist;
  const rows = item.rows ?? [];
  const progress = checklistProgress(rows);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace(`/bubble/${bubble.id}`)} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{item.type === 'NOTE' ? 'Note' : isChecklist ? 'Checklist' : 'Photo'}</Text>
          {manageable && <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${item.title} ${isChecklist ? 'checklist' : 'note'}`} onPress={() => setMenuOpen(true)} style={styles.manageButton}><Text style={styles.manageText}>···</Text></Pressable>}
        </View>
        <View style={styles.path}>
          <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => router.replace('/')}><Text style={styles.pathLink}>Home</Text></Pressable>
          <Text style={styles.chevron}>›</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/bubble/${bubble.id}`)}><Text style={styles.pathLink} numberOfLines={1}>{bubble.title}</Text></Pressable>
          <Text style={styles.chevron}>›</Text>
          <Text style={styles.pathCurrent} numberOfLines={1}>{item.title}</Text>
        </View>

        {item.type === 'PHOTO' && item.image ? (
          <View style={[styles.photoFrame, { height: Math.min(width * 0.78, 360) }]}>
            <Image source={item.image} resizeMode="contain" style={styles.photo} accessibilityLabel={item.title} />
          </View>
        ) : null}

        <View style={styles.typeBadge}><Text style={styles.typeText}>{item.type === 'NOTE' ? '✎  NOTE' : isChecklist ? '☑  CHECKLIST' : '▧  PHOTO'}</Text></View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.meta}</Text>
        {isChecklist ? <View style={styles.bodyCard}>
          <Text style={styles.progress}>{progress.done} of {progress.total} done</Text>
          {rows.map((row) => <Pressable key={row.id} accessibilityRole="checkbox" accessibilityLabel={row.text} aria-checked={row.done} onPress={() => void Promise.resolve(toggleChecklistRow(item.id, row.id)).catch(()=>{})} style={styles.checklistRow}>
            <View style={[styles.checkbox, row.done && styles.checkboxDone]}><Text style={styles.checkmark}>{row.done ? '✓' : ''}</Text></View>
            <Text style={[styles.rowText, row.done && styles.rowDone]}>{row.text}</Text>
          </Pressable>)}
        </View> : item.body ? <View style={styles.bodyCard}><Text selectable style={styles.body}>{item.body}</Text></View> : null}
      </ScrollView>
      {manageable && <ManagementMenu visible={menuOpen} title={item.title} onClose={() => setMenuOpen(false)} onEdit={() => afterMenuCloses(() => setEditing(true))} onDelete={() => afterMenuCloses(() => setConfirmDelete(true))} />}
      {manageable && editing && <EditContentSheet entry={item} onClose={() => setEditing(false)} onSave={async (draft) => { if (isChecklist) await updateChecklist(item.id, draft); else await updateNote(item.id, draft); setEditing(false); }} />}
      <ConfirmDialog visible={confirmDelete} title={`Delete ${item.title}?`} message={storageError || `This ${isChecklist ? 'checklist' : 'note'} will be removed from its Bubble. This cannot be undone.`} confirmLabel={`Delete ${isChecklist ? 'checklist' : 'note'}`} onCancel={() => setConfirmDelete(false)} onConfirm={async () => { try {if(isChecklist)await deleteChecklist(item.id);else await deleteNote(item.id);setConfirmDelete(false);router.replace(`/bubble/${bubble.id}`);}catch{/* Account banner keeps the failure visible; nothing is optimistically removed. */} }} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.page, paddingBottom: 48 },
  toolbar: { height: 50, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', left: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.text, fontSize: 35, lineHeight: 38, marginTop: -4 },
  manageButton: { position: 'absolute', right: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: colors.action, fontSize: 26, lineHeight: 27, fontWeight: '700', marginTop: -9 },
  toolbarTitle: { color: colors.text, fontSize: 16, fontWeight: '700', maxWidth: '65%' },
  path: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, marginBottom: 20, overflow: 'hidden' },
  pathLink: { color: colors.muted, fontSize: 13 },
  chevron: { color: colors.muted, fontSize: 18 },
  pathCurrent: { color: colors.action, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  photoFrame: { width: '100%', borderRadius: 28, backgroundColor: colors.lavenderSoft, overflow: 'hidden', marginBottom: 23 },
  photo: { width: '100%', height: '100%' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: colors.lavender, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, marginBottom: 11 },
  typeText: { color: colors.action, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 29, lineHeight: 36, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 22 },
  bodyCard: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20 },
  body: { color: colors.text, fontSize: 16, lineHeight: 25 },
  progress: { color: colors.action, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  checklistRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 9 },
  checkbox: { width: 40, height: 40, borderRadius: 14, borderWidth: 2, borderColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.lavender },
  checkmark: { color: colors.action, fontSize: 21, fontWeight: '700' },
  rowText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
  rowDone: { textDecorationLine: 'line-through', color: colors.muted },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
});
