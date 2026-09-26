import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

export function CoverPhoto({ source, style }: { source: ImageSourcePropType; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.frame, style]}>
      <Image source={source} resizeMode="cover" style={styles.image} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#E8DEF3' },
  image: { width: '100%', height: '100%' },
});
