import { StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../state/Profile';
import { colors } from '../theme/tokens';

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return `${first}${last}`.toLocaleUpperCase();
}

export function ProfileAvatar({ profile, size = 44 }: { profile: Profile; size?: number }) {
  return <View accessibilityLabel={`${profile.displayName || 'Profile'} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: profile.avatarColor }]}>
    <Text style={[styles.initials, { fontSize: size * 0.39 }]}>{profileInitials(profile.displayName)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.action, fontWeight: '700' },
});
