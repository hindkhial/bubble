import { AccountProvider, useAccount } from '../state/Account';
import { ActivityIndicator, Platform, View } from 'react-native';
import { ThemeProvider, useTheme } from '../theme/Theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function RootLayout() {
  return <SafeAreaProvider><AccountProvider><ThemeProvider><Routes /></ThemeProvider></AccountProvider></SafeAreaProvider>;
}
function Routes() {
  const account=useAccount();const {colors,mode,reduceMotion}=useTheme();
  if(!account.ready)return <View style={{flex:1,justifyContent:'center',backgroundColor:colors.background}}><ActivityIndicator accessibilityLabel="Verifying your session" color={colors.action}/></View>;
  const authenticated=Platform.OS!=='ios'||account.nativeVerified;
  return <><StatusBar style={mode==='dark'?'light':'dark'}/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.background},...(reduceMotion?{animation:'none' as const}:{})}}>
    <Stack.Protected guard={!authenticated}><Stack.Screen name="(auth)"/></Stack.Protected>
    <Stack.Protected guard={authenticated}><Stack.Screen name="(app)"/></Stack.Protected>
  </Stack></>;
}
