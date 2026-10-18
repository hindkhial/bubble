import { View } from 'react-native';
import { useTheme } from '../theme/Theme';

/** The two overlapping bubbles from the existing Home wordmark. */
export function BubbleLogo({ size = 33 }: { size?: number }) {
  const { colors } = useTheme();
  const scale = size / 33;
  return <View accessible accessibilityRole="image" accessibilityLabel="Bubble logo" style={{ width: size, height: 32 * scale }}>
    <View style={{ position: 'absolute', left: 0, top: 3 * scale, width: 22 * scale, height: 22 * scale, borderRadius: 11 * scale, backgroundColor: colors.lavenderDeep }} />
    <View style={{ position: 'absolute', left: 12 * scale, top: 8 * scale, width: 21 * scale, height: 21 * scale, borderRadius: 11 * scale, backgroundColor: colors.lavender }} />
  </View>;
}
