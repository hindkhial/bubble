import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAccount } from '../state/Account';
import { useTheme } from '../theme/Theme';

export function LogoutButton() {
  const account = useAccount();
  const { colors } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const logout = async () => {
    if (running.current || account.busy) return;
    running.current = true; setPending(true); setError('');
    try { await account.logout(); }
    catch { setError('Could not confirm server logout. Please reconnect and try again.'); }
    finally { running.current = false; setPending(false); }
  };
  return <View style={{ marginTop: 24 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: pending || account.busy, busy: pending }} disabled={pending || account.busy} onPress={() => void logout()} style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 24, borderRadius: 24, backgroundColor: colors.lavenderSoft }}>
      <Text style={{ color: colors.destructive, fontSize: 15, fontWeight: '600' }}>{pending ? 'Logging out…' : 'Log Out'}</Text>
    </Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 12 }}>{error}</Text> : null}
  </View>;
}
