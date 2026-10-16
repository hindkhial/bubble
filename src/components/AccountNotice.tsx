import { useRouter } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useAccount } from '../state/Account';
import { useTheme } from '../theme/Theme';
export function AccountNotice() {
  const account=useAccount();const router=useRouter();const {colors}=useTheme();
  if(Platform.OS!=='web')return null;
  return <View style={{backgroundColor:colors.surface,paddingHorizontal:16,paddingVertical:7}}>
    <Pressable style={{minHeight:44,justifyContent:'center'}} accessibilityRole="button" accessibilityLabel="Open account and workspace settings" onPress={()=>router.push('/account')}>
      <Text style={{color:colors.action,fontSize:12}}>{account.mode==='local'?'Local only · Account options':account.loading?'Loading account…':account.busy?'Saving to account…':account.user?'Account mode · '+account.user.email:'Account mode · Sign in required'}</Text>
    </Pressable>
    {account.error ? <Text accessibilityRole="alert" style={{color:colors.text,fontSize:12,marginTop:5}}>{account.error}</Text>:null}
  </View>;
}
