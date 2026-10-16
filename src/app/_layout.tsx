import { AccountNotice } from '../components/AccountNotice';
import { AccountProvider, useAccount } from '../state/Account';
import { ActivityIndicator, View } from 'react-native';
import { ThemeProvider, useTheme } from '../theme/Theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PinsProvider } from '../state/Pins';
import { ContentProvider } from '../state/Content';
import { ProfileProvider } from '../state/Profile';

export default function RootLayout() {
  return <AccountProvider><Bootstrap /></AccountProvider>;
}

function Bootstrap() {
  const account=useAccount();
  return !account.ready ? <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Opening your workspace" /></View> : <ThemeProvider><ThemedLayout /></ThemeProvider>;
}
function ThemedLayout() {
  const { colors, mode, reduceMotion } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ProfileProvider><ContentProvider><PinsProvider>
        <View style={{flex:1}}><AccountNotice /><Stack screenOptions={{ headerShown: false, ...(reduceMotion ? { animation: 'none' as const } : {}), contentStyle: { backgroundColor: colors.background } }} /></View>
      </PinsProvider></ContentProvider></ProfileProvider>
    </SafeAreaProvider>
  );
}
