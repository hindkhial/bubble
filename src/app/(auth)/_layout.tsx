import { Stack } from 'expo-router';
import { useTheme } from '../../theme/Theme';
export default function AuthLayout(){const {colors,reduceMotion}=useTheme();return <Stack initialRouteName="welcome" screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.background},...(reduceMotion?{animation:'none' as const}:{})}}/>;}
