import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAccount, configuredApi } from '../state/Account';
import { useTheme } from '../theme/Theme';
import { BubbleLogo } from './BubbleLogo';
import { createFormStyles } from './AddPreview';
import { ApiError } from '../api/client';
import { normalizedEmail, validateAuthentication } from '../api/authValidation';
import { nativeTransportAvailable, setPrivateBetaAccess } from '../api/transport';
import { useAnnouncement } from '../accessibility/useAnnouncement';

export function AuthExperience({kind}:{kind:'welcome'|'login'|'signup'}) {
 const account=useAccount();const router=useRouter();const {colors}=useTheme();const styles=createFormStyles(colors);
 const signup=kind==='signup';const [email,setEmail]=useState('');const [name,setName]=useState('');
 const [password,setPassword]=useState('');const [confirmation,setConfirmation]=useState('');const [shown,setShown]=useState(false);
 const [pending,setPending]=useState(false);const submitted=useRef(false);const [error,setError]=useState('');
 const [beta,setBeta]=useState(false);const [tester,setTester]=useState('');const [testerPassword,setTesterPassword]=useState('');
 const privateBetaEnabled=__DEV__ || process.env.EXPO_PUBLIC_PRIVATE_BETA_ACCESS==='1';
 useAnnouncement(error || account.error || account.authNotice);
 const go=(path:string)=>router.replace(path as Href);
 const submit=async()=>{
   if(submitted.current||account.busy||account.loading)return;
   const invalid=validateAuthentication({email,password,confirmation,displayName:name},signup);
   if(invalid){setError(invalid);return;}
   if(!nativeTransportAvailable){setError('Install the updated iOS build before signing in. Your existing device content is unchanged.');return;}
   if(!configuredApi()){setError('The private account service is not configured for this build. Your existing device data is unchanged.');return;}
   submitted.current=true;setPending(true);setError('');
   try{
     if(beta)await setPrivateBetaAccess(configuredApi(),tester,testerPassword);
     if(signup)await account.register(normalizedEmail(email),password,name.trim());
     await account.signIn(normalizedEmail(email),password);
     setPassword('');setConfirmation('');setTesterPassword('');
   }catch(problem){setError(signup&&problem instanceof ApiError&&problem.status===409?'An account with this email already exists. Log in instead.':problem instanceof Error?problem.message:'Could not sign in. Please try again.');}
   finally{submitted.current=false;setPending(false);}
 };
 const restore=async()=>{
   if(submitted.current||account.busy||account.loading)return;
   submitted.current=true;setPending(true);setError('');
   try{
     if(beta)await setPrivateBetaAccess(configuredApi(),tester,testerPassword);
     await account.resume();
   }catch(problem){setError(problem instanceof Error?problem.message:'Could not restore the session.');}
   finally{submitted.current=false;setPending(false);}
 };
 const blocked=pending||account.busy||account.loading;
 const button=(label:string,onPress:()=>void,primary=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled:blocked,busy:pending||account.loading}} disabled={blocked} onPress={onPress} style={[primary?styles.save:styles.cancel,{minHeight:48,justifyContent:'center'}]}><Text style={primary?styles.saveText:styles.cancelText}>{label}</Text></Pressable>;
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
  <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{padding:24,paddingBottom:40,width:'100%',maxWidth:520,alignSelf:'center',flexGrow:1,justifyContent:kind==='welcome'?'center':'flex-start'}}>
   <View style={{alignSelf:"center",marginBottom:24}}><BubbleLogo size={88}/></View>
   {account.loading?<ActivityIndicator accessibilityLabel="Verifying your session" color={colors.action}/>:null}
   <Text accessibilityRole="header" style={styles.title}>{kind==='welcome'?'Welcome to Bubble':signup?'Make yourself at home':'Welcome back'}</Text>
   <Text style={styles.intro}>{kind==='welcome'?'A quiet space for your notes, lists and everyday thoughts. Sign in to open your personal space.':signup?'Create your account to begin. Existing content on this iPhone stays private until you choose to copy it.':'Log in to your personal space. Your existing device content stays separate.'}</Text>
   {kind==='welcome'?<>{button('Log In',()=>go('/login'),true)}{button('Create Account',()=>go('/signup'))}</>:<>
    {signup?<><Text style={styles.label}>Display name</Text><TextInput accessibilityLabel="Display name" editable={!pending} value={name} onChangeText={setName} maxLength={80} autoComplete="name" textContentType="name" style={styles.input}/></>:null}
    <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" editable={!pending} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" maxLength={320} style={styles.input}/>
    <Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" editable={!pending} value={password} onChangeText={setPassword} secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false} autoComplete={signup?'new-password':'current-password'} textContentType={signup?'newPassword':'password'} style={styles.input}/>
    {signup?<><Text style={styles.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" editable={!pending} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" style={styles.input}/><Text style={styles.intro}>Use at least 12 characters, up to 72 UTF-8 bytes.</Text></>:null}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Show password" accessibilityState={{checked:shown,disabled:pending}} disabled={pending} onPress={()=>setShown(!shown)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.action}}>{shown?'Hide password':'Show password'}</Text></Pressable>
    {privateBetaEnabled?<>{button(beta?'Hide private beta access':'Private beta access',()=>setBeta(!beta))}{beta?<><Text style={styles.intro}>Use your private beta invitation credentials if this environment requires them. These stay in memory.</Text><TextInput accessibilityLabel="Private beta username" value={tester} onChangeText={setTester} autoCapitalize="none" autoCorrect={false} editable={!pending} style={styles.input}/><TextInput accessibilityLabel="Private beta password" value={testerPassword} onChangeText={setTesterPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!pending} style={styles.input}/></>:null}</>:null}
    {pending?<ActivityIndicator accessibilityLabel="Signing in" color={colors.action}/>:null}
    {button(pending?'Please wait…':signup?'Create Account':'Log In',()=>void submit(),true)}
    {!signup?button('Restore existing session',()=>void restore()):null}
    {button(signup?'Already have an account? Log In':'New here? Create Account',()=>go(signup?'/login':'/signup'))}
    {button('Back to welcome',()=>go('/welcome'))}
   </>}
   {account.authNotice?<Text accessibilityLiveRegion="polite" style={[styles.intro,{color:colors.action}]}>{account.authNotice}</Text>:null}
   {error||account.error?<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.intro,{color:colors.destructive}]}>{error||account.error}</Text>:null}
   <Text style={styles.intro}>An internet connection is required to verify your account when opening Bubble. Existing device content is never uploaded automatically.</Text>
  </ScrollView>
 </KeyboardAvoidingView></SafeAreaView>;
}
