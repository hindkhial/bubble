import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export function ManagementMenu({ visible, title, onEdit, onDelete, onClose }: {
  visible: boolean; title: string; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.scrim} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
        <View style={styles.handle} />
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.action}><Text style={styles.actionText}>Edit</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.action}><Text style={styles.deleteText}>Delete</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(52,46,56,0.34)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 17 },
  action: { minHeight: 50, justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  deleteText: { color: '#9C3F55', fontSize: 16, fontWeight: '700' },
  cancel: { marginTop: 10, minHeight: 48, borderRadius: 24, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.action, fontSize: 15, fontWeight: '700' },
});
