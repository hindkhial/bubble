import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  const identifier = process.env.BUBBLE_IOS_BUNDLE_IDENTIFIER;
  if (identifier && !/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/.test(identifier)) throw new Error('Invalid approved iOS bundle identifier.');
  return { ...config, name: 'Bubble', slug: 'bubble',
    ios: { ...config.ios, supportsTablet: false, ...(identifier ? { bundleIdentifier: identifier } : {}) },
  };
};
