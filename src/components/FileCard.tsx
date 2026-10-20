import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { checklistProgress } from '../data/sample';
import type { SampleItem } from '../data/sample';
import { spacing } from '../theme/tokens';
import { CoverPhoto } from './CoverPhoto';
import { coverHeight } from '../utils/bubbleCover';
import { PinnedMarker } from './PinnedMarker';

export function FileCard({ item, pinned, onOpenActions, onRead }: { item: SampleItem; pinned: boolean; onOpenActions: () => void; onRead?:()=>void }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const columnWidth = (width - spacing.page * 2 - 12) / 2;
  const photoRatio = 1 / coverHeight(1, item.cardImageRatio);
  const isNote = item.type === 'NOTE';
  const isChecklist = item.type === 'CHECKLIST';
  const checklistRows = item.rows ?? [];
  const progress = checklistProgress(checklistRows);
  const webContextMenu = Platform.OS === 'web' ? { onContextMenu: (event: { preventDefault: () => void }) => { event.preventDefault(); onOpenActions(); } } : {};

  return (
    <View style={[styles.card, item.type === 'PHOTO' && styles.photoCard]}><Pressable
      {...webContextMenu}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title} ${item.type.toLowerCase()}`}
      onPress={() => onRead ? onRead() : router.push(`/file/${item.id}`)}
      onLongPress={onRead ? undefined : onOpenActions}
      delayLongPress={450}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {!onRead && !isNote && item.image ? <CoverPhoto source={item.image} style={[styles.photo, { aspectRatio:photoRatio }]} /> : null}
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.type}>{isNote ? '✎  NOTE' : isChecklist ? '☑  CHECKLIST' : '▧  PHOTO'}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {isNote && <Text style={styles.preview} numberOfLines={3}>{item.preview}</Text>}
        {isChecklist && <View style={styles.checklistPreview}>{checklistRows.slice(0, 3).map((row) => <Text key={row.id} style={[styles.preview, row.done && styles.completed]} numberOfLines={2}>{row.done ? '☑' : '☐'}  {row.text}</Text>)}</View>}
        {isChecklist && <Text style={styles.progress}>{progress.done} of {progress.total} done</Text>}
        <Text style={[styles.meta, item.type === 'PHOTO' && { color: colors.text }]}>{item.meta}</Text>
      </View>
    </Pressable>
      {!onRead && <PinnedMarker pinned={pinned} title={`${item.title} ${item.type.toLowerCase()}`} onPress={onOpenActions} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { width: '100%', borderRadius: 27, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  photoCard: { backgroundColor: colors.lavenderSoft },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  photo: { width: '100%' },
  body: { paddingHorizontal: 14, paddingVertical: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  type: { color: colors.action, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  preview: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 7 },
  checklistPreview: { marginTop: 2 },
  completed: { textDecorationLine: 'line-through' },
  progress: { color: colors.action, fontSize: 12, fontWeight: '700', marginTop: 11 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 11 },
});
