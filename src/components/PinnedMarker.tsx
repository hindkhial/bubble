import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

export function PinnedMarker({ title, onPress, inline = false }: { title: string; onPress: () => void; inline?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Options for pinned ${title}`}
      hitSlop={5}
      onPress={(event) => { event.stopPropagation(); onPress(); }}
      style={[styles.marker, inline && styles.inline]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d="M8 3h8l-1 5 3 3v2H6v-2l3-3-1-5Zm4 10v8" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', top: 10, right: 10, zIndex: 3, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  inline: { position: 'relative', top: 0, right: 0, width: 31, height: 31, borderRadius: 16 },
});
