import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { newChecklistRow } from '../data/sample';
import type { ChecklistRow } from '../data/sample';

export function ChecklistEditorRows({ rows, onChange, creating = false }: { rows: ChecklistRow[]; onChange: (rows: ChecklistRow[]) => void; creating?: boolean }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const changeRow = (id: string, update: Partial<ChecklistRow>) => onChange(rows.map((row) => row.id === id ? { ...row, ...update } : row));
  return <View>
    {rows.map((row, index) => <View key={row.id} style={styles.row}>
      {!creating ? <Pressable accessibilityRole="checkbox" accessibilityLabel={`Item ${index + 1} complete`} accessibilityState={{ checked: row.done }} onPress={() => changeRow(row.id, { done: !row.done })} style={[styles.check, row.done && styles.checked]}><Text style={styles.checkText}>{row.done ? '✓' : ''}</Text></Pressable> : null}
      <TextInput accessibilityLabel={`Checklist item ${index + 1}`} value={row.text} onChangeText={(text) => changeRow(row.id, { text })} placeholder="List item" placeholderTextColor={colors.muted} multiline style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove item ${index + 1}`} onPress={() => onChange(rows.filter((candidate) => candidate.id !== row.id))} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Add checklist item" onPress={() => onChange([...rows, newChecklistRow()])} style={[styles.add, creating && styles.addCompact]}><Text style={styles.addText}>{creating ? '＋' : '＋ Add an item'}</Text></Pressable>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  addCompact: { width: 48, height: 48, borderRadius: 24, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  check: { width: 44, height: 44, borderRadius: 15, borderWidth: 2, borderColor: colors.action, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.lavender },
  checkText: { color: colors.action, fontSize: 22, fontWeight: '700' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, backgroundColor: colors.input },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.destructive, fontSize: 27, lineHeight: 30 },
  add: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderSoft },
  addText: { color: colors.action, fontWeight: '700', fontSize: 14 },
});
