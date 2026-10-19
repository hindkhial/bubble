import { Stack } from 'expo-router';
import { View } from 'react-native';
import { ProfileProvider } from '../../state/Profile';
import { ContentProvider } from '../../state/Content';
import { PinsProvider } from '../../state/Pins';
import { AccountNotice } from '../../components/AccountNotice';
import { useAccount } from '../../state/Account';
import { useTheme } from '../../theme/Theme';
export default function PrivateLayout(){
 const account=useAccount();const {colors,reduceMotion}=useTheme();
 return <ProfileProvider key={account.user?.id??'local'}><ContentProvider><PinsProvider><View style={{flex:1,backgroundColor:colors.background}}><AccountNotice/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.background},...(reduceMotion?{animation:'none' as const}:{})}}/></View></PinsProvider></ContentProvider></ProfileProvider>;
}
