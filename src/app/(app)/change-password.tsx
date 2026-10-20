import { useRef, useState } from 'react';
import { useAnnouncement } from '../../accessibility/useAnnouncement';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from '../../state/Account';
import { useTheme } from '../../theme/Theme';
import { createFormStyles } from '../../components/AddPreview';
import { validatePasswordChange } from '../../api/authValidation';

export default function ChangePasswordScreen() {
  const account = useAccount(); const router = useRouter(); const { colors } = useTheme(); const styles = createFormStyles(colors);
  const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [shown, setShown] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const running = useRef(false);
  useAnnouncement(error || account.error);
  const unavailable = !account.user || account.mode !== 'account';
  const disabled = pending || account.busy || account.blocked || unavailable;
  const save = async () => {
    if (running.current || disabled) return;
    const invalid = validatePasswordChange(current, next, confirmation);
    if (invalid) { setError(invalid); return; }
    running.current = true; setPending(true); setError('');
    try {
      await account.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirmation('');
      if (Platform.OS !== 'ios') router.replace('/account');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not change your password.'); }
    finally { running.current = false; setPending(false); }
  };
  const cancel = () => { setCurrent(''); setNext(''); setConfirmation(''); router.replace('/account'); };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 24, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <Text accessibilityRole="header" style={styles.title}>Change Password</Text>
        <Text style={styles.intro}>Use 12 or more characters, up to 72 UTF-8 bytes. After saving, log in again on each device. Your saved content stays intact.</Text>
        {unavailable ? <Text accessibilityRole="alert" style={styles.intro}>Log in to change your password.</Text> : null}
        {[
          { label: 'Current password', value: current, set: setCurrent, fresh: false },
          { label: 'New password', value: next, set: setNext, fresh: true },
          { label: 'Confirm new password', value: confirmation, set: setConfirmation, fresh: true },
        ].map(field => <TextField key={field.label} {...field} shown={shown} disabled={disabled} />)}
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Show passwords" accessibilityState={{ checked: shown, disabled: pending }} disabled={pending} onPress={() => setShown(!shown)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.action }}>{shown ? 'Hide passwords' : 'Show passwords'}</Text></Pressable>
        {error || account.error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.intro, { color: colors.destructive }]}>{error || account.error}</Text> : null}
        {pending ? <ActivityIndicator accessibilityLabel="Changing password" color={colors.action} /> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: pending }} disabled={disabled} onPress={() => void save()} style={[styles.save, { minHeight: 48, justifyContent: 'center' }]}><Text style={styles.saveText}>{pending ? 'Saving…' : 'Save Changes'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={pending} onPress={cancel} style={[styles.cancel, { minHeight: 48, justifyContent: 'center' }]}><Text style={styles.cancelText}>Cancel</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function TextField({ label, value, set, fresh, shown, disabled }: { label: string; value: string; set: (value: string) => void; fresh: boolean; shown: boolean; disabled: boolean }) {
  const { colors } = useTheme(); const styles = createFormStyles(colors);
  return <>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={set} editable={!disabled} secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false} autoComplete={fresh ? 'new-password' : 'current-password'} textContentType={fresh ? 'newPassword' : 'password'} style={styles.input} />
  </>;
}
