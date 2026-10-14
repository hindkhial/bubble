import { themedAvatarColor } from '../theme/appearance';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../state/Profile';
import { profileInitials } from '../utils/profile';
export { profileInitials } from '../utils/profile';

export function ProfileAvatar({ profile, size = 44 }: { profile: Profile; size?: number }) {
  const { colors, mode } = useTheme();
  const styles = createStyles(colors);
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const showImage = profile.imageUri && profile.imageUri !== failedUri;
  return <View accessible accessibilityLabel={`${profile.displayName || 'Profile'} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: themedAvatarColor(profile.avatarColor, mode) }]}>
    {showImage ? <Image source={{ uri: profile.imageUri }} onError={() => setFailedUri(profile.imageUri)} accessible={false} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <Text style={[styles.initials, { fontSize: size * 0.39 }]}>{profile.avatarEmoji || profileInitials(profile.displayName)}</Text>}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.action, fontWeight: '700' },
});
