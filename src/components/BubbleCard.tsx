import { themedAvatarColor } from '../theme/appearance';
import { useTheme } from '../theme/Theme';
import type { ThemeColors } from '../theme/appearance';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverPhoto } from './CoverPhoto';
import { BubbleSheen } from './BubbleSheen';
import { PinnedMarker } from './PinnedMarker';
import { useContent } from '../state/Content';
import type { Bubble } from '../data/sample';
import { spacing } from '../theme/tokens';

export function BubbleCard({ bubble, pinned, onOpenActions }: { bubble: Bubble; pinned: boolean; onOpenActions: () => void }) {
  const { colors, mode } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { bubbleCountLabel } = useContent();
  const { width } = useWindowDimensions();
  const columnWidth = (width - spacing.page * 2 - 12) / 2;
  const photoHeight = Math.max(115, Math.min(260, columnWidth * bubble.cardImageRatio));
  const webContextMenu = Platform.OS === 'web' ? { onContextMenu: (event: { preventDefault: () => void }) => { event.preventDefault(); onOpenActions(); } } : {};
  return (
    <View style={styles.card}><Pressable
      {...webContextMenu}
      accessibilityRole="button"
      accessibilityLabel={`Open ${bubble.title} Bubble`}
      onPress={() => router.push(`/bubble/${bubble.id}`)}
      onLongPress={onOpenActions}
      delayLongPress={450}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {bubble.cover ? <CoverPhoto source={bubble.cover} style={[styles.photo, { height: photoHeight }]} /> : <View style={[styles.photo, styles.defaultCover, { height: photoHeight, backgroundColor: bubble.color ? themedAvatarColor(bubble.color, mode) : colors.lavender }]}><Text style={styles.defaultCoverIcon}>◌</Text></View>}
      <View style={[styles.caption, { backgroundColor: bubble.color ? themedAvatarColor(bubble.color, mode) : colors.lavender }]}>
        <Text style={styles.marker}>◌ BUBBLE</Text>
        <Text style={styles.title} numberOfLines={2}>{bubble.title}</Text>
        <Text style={styles.count} numberOfLines={2}>{bubbleCountLabel(bubble.id)}</Text>
      </View>
      <BubbleSheen id={bubble.id} />
    </Pressable>
      {pinned && <PinnedMarker title={`${bubble.title} Bubble`} onPress={onOpenActions} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { width: '100%', borderRadius: 36, overflow: 'hidden', backgroundColor: colors.lavender, shadowColor: colors.action, shadowOpacity: 0.1, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  photo: { width: '100%' },
  defaultCover: { alignItems: 'center', justifyContent: 'center' },
  defaultCoverIcon: { color: colors.action, fontSize: 64, lineHeight: 74 },
  caption: { minHeight: 93, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 10, justifyContent: 'center' },
  marker: { color: colors.action, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 4 },
  title: { color: colors.text, fontSize: 16, lineHeight: 19, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 11, lineHeight: 14, marginTop: 3 },
});
