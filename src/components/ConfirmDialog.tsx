import { MotionAwareModal as Modal } from './MotionAwareModal';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, destructive = true, embedded = false }: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  embedded?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  if (!visible) return null;
  const content = <View accessibilityViewIsModal style={[styles.scrim, embedded && StyleSheet.absoluteFill]}>
      <View accessibilityRole="alert" style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.keep}><Text style={styles.keepText}>{destructive ? 'Cancel' : 'Keep editing'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={styles.confirm}><Text style={[styles.confirmText, destructive && styles.destructive]}>{confirmLabel}</Text></Pressable>
      </View>
    </View>;
  return embedded ? content : <Modal visible transparent animationType="fade" onRequestClose={onCancel}>{content}</Modal>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(52,46,56,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 390, backgroundColor: colors.surface, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 21, fontWeight: '700', marginBottom: 10 },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 19 },
  keep: { minHeight: 48, borderRadius: 24, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center' },
  keepText: { color: colors.action, fontSize: 15, fontWeight: '700' },
  confirm: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  confirmText: { color: colors.action, fontSize: 15, fontWeight: '700' },
  destructive: { color: colors.destructive },
});
