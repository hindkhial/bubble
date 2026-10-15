import { useAccount } from '../state/Account';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { accentPalette, type ThemeColors } from '../theme/appearance';
import { useTheme } from '../theme/Theme';

export function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const { colors, mode, selectedMode, setMode, accent, setAccent, storageError } = useTheme();
  const account=useAccount();
  const styles = createStyles(colors);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.scrim}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Appearance</Text>
          <Text style={styles.description}>A little more you, in every Bubble.</Text>
          <Text accessibilityRole="header" style={styles.label}>Mode</Text>
          <View style={styles.modes}>
            {(account.mode==='account' ? ['light','dark','system'] as const : ['light','dark'] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: selectedMode === option }} disabled={account.busy || account.loading} onPress={() => setMode(option)} style={[styles.mode, selectedMode === option && styles.selected]}>
              <Text style={styles.modeText}>{option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}{selectedMode === option ? ' ✓' : ''}</Text>
            </Pressable>)}
          </View>
          <Text accessibilityRole="header" style={styles.label}>Customize your app</Text>
          <Text style={styles.description}>Choose your accent. Dark mode uses a deeper shade of the same color.</Text>
          <View style={styles.palette}>
            {accentPalette.map((option) => <Pressable key={option.name} accessibilityRole="radio" accessibilityLabel={`${option.name} app color`} accessibilityState={{ checked: accent === option.name }} disabled={account.busy || account.loading} onPress={() => setAccent(option.name)} style={[styles.colorOption, accent === option.name && styles.selected]}>
              <View style={[styles.swatch, { backgroundColor: mode === 'dark' ? option.dark : option.value }]}><Text style={styles.check}>{accent === option.name ? '✓' : ''}</Text></View>
              <Text style={styles.colorName}>{option.name}</Text>
            </Pressable>)}
          </View>
          {storageError ? <Text accessibilityRole="alert" style={styles.note}>{storageError}</Text> : null}
          <Text style={styles.note}>{account.mode==='account' ? 'Account changes apply after the server confirms them. A connection is required.' : 'Changes apply immediately and are saved in this browser when local storage is available.'}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.modeText}>Done</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,16,25,0.5)' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  content: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 12 },
  modes: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  mode: { flex: 1, minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  modeText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  selected: { backgroundColor: colors.lavenderSoft, borderColor: colors.action },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorOption: { flexBasis: '30%', flexGrow: 1, minWidth: 95, minHeight: 92, borderWidth: 2, borderColor: colors.border, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  check: { color: colors.action, fontSize: 20, fontWeight: '700' },
  colorName: { color: colors.text, fontSize: 12, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 18 },
  close: { minHeight: 52, borderRadius: 26, backgroundColor: colors.lavenderSoft, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
});
