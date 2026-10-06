import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { PinsProvider } from '../state/Pins';
import { ContentProvider } from '../state/Content';
import { ProfileProvider } from '../state/Profile';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ProfileProvider><ContentProvider><PinsProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </PinsProvider></ContentProvider></ProfileProvider>
    </SafeAreaProvider>
  );
}
