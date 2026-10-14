import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SampleItem } from '../data/sample';
import { useTheme } from '../theme/Theme';
import { usePins } from '../state/Pins';
import { fileRoute } from '../utils/dashboard';

export function ContentRows({ items }: { items: SampleItem[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { pinsFor } = usePins();
  return <View style={{ gap: 10 }}>{items.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.title} ${item.type === 'CHECKLIST' ? 'list' : 'note'}`} onPress={() => router.push(fileRoute(item.id))} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={{ color: colors.action, fontSize: 12 }}>{pinsFor(item.bubbleId).includes(`file:${item.id}`) ? 'Pinned · ' : ''}{item.type === 'CHECKLIST' ? 'List' : 'Note'}</Text>
    <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</Text>
    <Text numberOfLines={2} style={{ color: colors.muted, lineHeight: 20 }}>{item.type === 'CHECKLIST' ? (item.rows ?? []).map((row) => `${row.done ? '☑' : '☐'} ${row.text}`).join(' · ') : item.body || 'An empty note, ready for a thought.'}</Text>
  </Pressable>)}</View>;
}
const styles = StyleSheet.create({ row: { minHeight: 96, borderWidth: 1, borderRadius: 22, padding: 16 }, title: { fontSize: 17, fontWeight: '600', marginVertical: 6 } });
