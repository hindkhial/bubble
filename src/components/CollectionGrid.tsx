import { MotionAwareModal as Modal } from './MotionAwareModal';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useMemo, useState } from 'react';
import { orderCollectionEntries } from '../utils/collectionOrder';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CollectionEntry } from '../data/sample';
import { usePins } from '../state/Pins';
import { BubbleCard } from './BubbleCard';
import { FileCard } from './FileCard';

const entryKey = (entry: CollectionEntry) => `${entry.kind}:${entry.value.id}`;

export function CollectionGrid({ entries, scopeId, respectEntryScopes = false }: { entries: CollectionEntry[]; scopeId: string; respectEntryScopes?: boolean }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { pinsFor, togglePin } = usePins();
  const [selected, setSelected] = useState<CollectionEntry | null>(null);
  const [actionError,setActionError]=useState('');
  const [limitReached, setLimitReached] = useState(false);
  const entryScope = (entry: CollectionEntry) => respectEntryScopes ? entry.kind === 'bubble' ? entry.value.parentId ?? 'root' : entry.value.bubbleId : scopeId;
  const { pins, ordered } = useMemo(() => orderCollectionEntries(entries, scopeId, respectEntryScopes, pinsFor),
    [entries, scopeId, respectEntryScopes, pinsFor]);
  const columns: CollectionEntry[][] = [[], []];
  ordered.forEach((entry, index) => columns[index % 2].push(entry));

  const openActions = (entry: CollectionEntry) => {
    setLimitReached(false);setActionError('');
    setSelected(entry);
  };
  const closeActions = () => {
    setSelected(null);
    setLimitReached(false);
  };
  const openSelected = () => {
    if (!selected) return;
    const destination = selected.kind === 'bubble' ? `/bubble/${selected.value.id}` as const : `/file/${selected.value.id}` as const;
    closeActions();
    router.push(destination);
  };
  const toggleSelectedPin = async () => {
    if (!selected) return;
    try {if (await togglePin(entryScope(selected), entryKey(selected))) closeActions();else setLimitReached(true);}catch(problem){setActionError(problem instanceof Error?problem.message:'Could not pin.');}
  };

  return (
    <View>
      <View style={styles.columns}>
        {columns.map((column, index) => (
          <View key={index} style={styles.column}>
            {column.map((entry) => {
              const key = entryKey(entry);
              const pinned = pins.has(key);
              return entry.kind === 'bubble'
                ? <BubbleCard key={key} bubble={entry.value} pinned={pinned} onOpenActions={() => openActions(entry)} />
                : <FileCard key={key} item={entry.value} pinned={pinned} onOpenActions={() => openActions(entry)} />;
            })}
          </View>
        ))}
      </View>
      <Modal animationType="slide" transparent visible={selected !== null} onRequestClose={closeActions}>
        <Pressable style={styles.scrim} onPress={closeActions}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetType}>{selected?.kind === 'bubble' ? 'BUBBLE' : selected?.value.type}</Text>
            <Text style={styles.sheetTitle} numberOfLines={2}>{selected?.value.title}</Text>
            {actionError ? <Text accessibilityRole="alert" style={styles.limit}>{actionError}</Text> : null}
            {limitReached && <Text accessibilityRole="alert" style={styles.limit}>You can pin up to 3 items here. Unpin one first.</Text>}
            <Pressable accessibilityRole="button" onPress={openSelected} style={styles.action}><Text style={styles.actionText}>Open</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={toggleSelectedPin} style={styles.action}><Text style={styles.actionText}>{selected && pins.has(entryKey(selected)) ? 'Unpin' : 'Pin to top'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={closeActions} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  columns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  column: { flex: 1, gap: 12 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(52,46,56,0.34)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  sheetType: { color: colors.action, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 17 },
  action: { minHeight: 50, justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cancel: { marginTop: 10, minHeight: 48, borderRadius: 24, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.action, fontSize: 15, fontWeight: '700' },
  limit: { color: colors.action, backgroundColor: colors.lavenderSoft, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, fontSize: 13, marginBottom: 12 },
});
