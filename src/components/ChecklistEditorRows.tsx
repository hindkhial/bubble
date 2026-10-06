import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { newChecklistRow } from '../data/sample';
import type { ChecklistRow } from '../data/sample';
import { colors } from '../theme/tokens';

export function ChecklistEditorRows({ rows, onChange }: { rows: ChecklistRow[]; onChange: (rows: ChecklistRow[]) => void }) {
  const changeRow = (id: string, update: Partial<ChecklistRow>) => onChange(rows.map((row) => row.id === id ? { ...row, ...update } : row));
  return <View>
    {rows.map((row, index) => <View key={row.id} style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Item ${index + 1} complete`} accessibilityState={{ checked: row.done }} onPress={() => changeRow(row.id, { done: !row.done })} style={[styles.check, row.done && styles.checked]}><Text style={styles.checkText}>{row.done ? '✓' : ''}</Text></Pressable>
      <TextInput accessibilityLabel={`Checklist item ${index + 1}`} value={row.text} onChangeText={(text) => changeRow(row.id, { text })} placeholder="List item" placeholderTextColor={colors.muted} multiline style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove item ${index + 1}`} onPress={() => onChange(rows.filter((candidate) => candidate.id !== row.id))} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>
    </View>)}
    <Pressable accessibilityRole="button" onPress={() => onChange([...rows, newChecklistRow()])} style={styles.add}><Text style={styles.addText}>＋ Add an item</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  check: { width: 44, height: 44, borderRadius: 15, borderWidth: 2, borderColor: colors.action, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.lavender },
  checkText: { color: colors.action, fontSize: 22, fontWeight: '700' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, backgroundColor: colors.white },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#9C3F55', fontSize: 27, lineHeight: 30 },
  add: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderSoft },
  addText: { color: colors.action, fontWeight: '700', fontSize: 14 },
});
