import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// A few uneven, translucent highlights suggest soap film without tracing the
// whole card in a bright rainbow border.
export function BubbleSheen({ id }: { id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 180 234" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.48} />
          <Stop offset="38%" stopColor="#F8F6FF" stopOpacity={0.25} />
          <Stop offset="72%" stopColor="#E6F2FF" stopOpacity={0.09} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`upper-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.74} />
          <Stop offset="28%" stopColor="#F5E4F5" stopOpacity={0.52} />
          <Stop offset="55%" stopColor="#D7E8FF" stopOpacity={0.31} />
          <Stop offset="82%" stopColor="#F7F0D9" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`lower-${id}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#CBE8F5" stopOpacity={0} />
          <Stop offset="30%" stopColor="#C7DDFC" stopOpacity={0.48} />
          <Stop offset="58%" stopColor="#F0CDE6" stopOpacity={0.53} />
          <Stop offset="82%" stopColor="#F9EBC3" stopOpacity={0.35} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Ellipse cx="20" cy="12" rx="84" ry="64" fill={`url(#glow-${id})`} />
      <Ellipse cx="167" cy="225" rx="64" ry="62" fill={`url(#glow-${id})`} />

      <Path d="M 0 0 L 93 0 C 48 15 30 45 26 79 C 17 95 8 101 0 105 Z" fill={`url(#upper-${id})`} opacity={0.38} />
      <Path d="M 82 234 C 124 225 153 208 180 166 L 180 234 Z" fill={`url(#lower-${id})`} opacity={0.42} />

      <Path d="M 7 88 C 6 67 6 47 12 31 C 19 13 35 8 57 7 C 78 6 94 9 108 13" fill="none" stroke={`url(#upper-${id})`} strokeWidth="14" strokeLinecap="round" opacity={0.48} />
      <Path d="M 16 78 C 16 55 18 38 31 25 C 44 14 61 14 79 17" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity={0.25} />

      <Path d="M 65 226 C 94 229 120 229 142 224 C 163 219 173 206 173 184" fill="none" stroke={`url(#lower-${id})`} strokeWidth="16" strokeLinecap="round" opacity={0.47} />
      <Path d="M 105 225 C 129 226 148 221 160 211 C 169 203 173 192 173 176" fill="none" stroke="#C9E5F4" strokeWidth="3" strokeLinecap="round" opacity={0.24} />
      <Path d="M 84 230 C 116 234 144 227 160 216" fill="none" stroke="#F5D9EB" strokeWidth="2" strokeLinecap="round" opacity={0.22} />

      <Rect x="1" y="1" width="178" height="232" rx="35" fill="none" stroke="#FFFFFF" strokeWidth="1.6" opacity={0.58} />
    </Svg>
  );
}
