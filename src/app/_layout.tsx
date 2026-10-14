import { ThemeProvider, useTheme } from '../theme/Theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PinsProvider } from '../state/Pins';
import { ContentProvider } from '../state/Content';
import { ProfileProvider } from '../state/Profile';

export default function RootLayout() {
  return <ThemeProvider><ThemedLayout /></ThemeProvider>;
}

function ThemedLayout() {
  const { colors, mode } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ProfileProvider><ContentProvider><PinsProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </PinsProvider></ContentProvider></ProfileProvider>
    </SafeAreaProvider>
  );
}
