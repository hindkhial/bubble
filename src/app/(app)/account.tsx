import { NativeAccountSettings } from '../../components/NativeAccountSettings';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from '../../state/Account';
import { useTheme } from '../../theme/Theme';
import { createFormStyles } from '../../components/AddPreview';
import { browserStorage, readStored } from '../../storage/browser';
import type { SampleItem } from '../../data/sample';
export default function AccountScreen() {return Platform.OS==='ios'?<NativeAccountSettings/>:<BrowserAccountScreen/>;}
function BrowserAccountScreen() {
  const account=useAccount();const {colors}=useTheme();const styles=createFormStyles(colors);const router=useRouter();
  const [registering,setRegistering]=useState(false);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');
  const [pending,setPending]=useState(false);const [message,setMessage]=useState('');
  const [localItems,setLocalItems]=useState<SampleItem[]|null>(null);const [selected,setSelected]=useState<string[]>([]);
  const run=async(action:()=>Promise<void>)=>{if(pending)return;setPending(true);setMessage('');try{await action();}catch(error){setMessage(error instanceof Error?error.message:'Could not complete the request.');}finally{setPending(false);}};
  const login=()=>run(async()=>{if(registering)await account.register(email,password,name);await account.signIn(email,password);setPassword('');if(account.mode==='local')router.replace('/');});
  const review=()=>{try{const storage=browserStorage();if(!storage)throw new Error('Browser storage is unavailable; copying is disabled.');const items=readStored<SampleItem[]>(storage,'bubble.items.v1',[],(value):value is SampleItem[]=>Array.isArray(value)&&value.every(item=>item&&typeof item.id==='string'&&typeof item.title==='string'&&typeof item.body==='string'&&['NOTE','PHOTO','CHECKLIST'].includes(item.type)));setLocalItems(items.filter(item=>item.type!=='PHOTO'));setSelected([]);}catch(error){setMessage(error instanceof Error?error.message:'Could not read local content.');}};
  const copy=()=>run(async()=>{if(!account.user)throw new Error('Sign in first.');const storage=browserStorage();if(!storage)throw new Error('Browser storage is unavailable.');const count=await account.importSelected(storage,(localItems??[]).filter(item=>selected.includes(item.id)));setSelected([]);setMessage(`Copied ${count} new items. Confirmed previous copies were skipped. Your local originals were kept.`);});
  return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,width:'100%',maxWidth:560,alignSelf:'center'}}>
    <Text accessibilityRole="header" style={styles.title}>Your workspace</Text>
    <Text style={styles.intro}>Local mode needs no account. Account mode uses the server and needs a connection. Signing in never uploads your local notes.</Text>
    <Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={()=>{account.local();router.replace('/');}} style={styles.cancel}><Text style={styles.cancelText}>Use local mode</Text></Pressable>
    {account.user && account.mode==='account' ? <>
      <Text style={styles.label}>Signed in as {account.user.email}</Text><Text style={styles.intro}>Switching to local mode does not sign out. Use Log Out on You on a shared device.</Text>
      <Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={()=>void run(async()=>{await account.refresh();})} style={styles.cancel}><Text style={styles.cancelText}>Refresh account</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={()=>router.push("./change-password")} style={styles.cancel}><Text style={styles.cancelText}>Change Password</Text></Pressable>
      <Text style={styles.label}>Copy local content to this account</Text><Text style={styles.intro}>Review and select notes or lists yourself. Copies get new server IDs. Originals, Bubbles, photos, profile and local appearance stay in this browser. This is a one-time copy, not synchronization.</Text>
      <Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={review} style={styles.cancel}><Text style={styles.cancelText}>Review local notes and lists</Text></Pressable>
      {localItems?.map(item=><Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={`Copy ${item.title}`} aria-checked={selected.includes(item.id)} disabled={pending} onPress={()=>setSelected(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id])} style={styles.destinationChoice}><Text style={styles.destinationText}>{selected.includes(item.id)?'✓ ':''}{item.title} · {item.type==='CHECKLIST'?'List':'Note'}</Text></Pressable>)}
      {localItems?.length===0?<Text style={styles.intro}>No local notes or lists to copy.</Text>:null}
      {selected.length?<Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={()=>void copy()} style={styles.save}><Text style={styles.saveText}>Copy {selected.length} selected items to my account</Text></Pressable>:null}
    </> : <>
      <Pressable accessibilityRole="button" disabled={pending||account.loading||Platform.OS!=='web'} onPress={()=>void run(async()=>{await account.resume();})} style={styles.cancel}><Text style={styles.cancelText}>Use existing account session</Text></Pressable>
      <Text style={styles.label}>{registering?'Create an account':'Sign in'}</Text>
      {Platform.OS!=='web'?<Text style={styles.intro}>Account mode currently supports the browser. Native local mode remains available.</Text>:null}
      {registering?<><Text style={styles.label}>Display name</Text><TextInput accessibilityLabel="Account display name" value={name} onChangeText={setName} maxLength={80} style={styles.input}/></>:null}
      <Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={320} style={styles.input}/>
      <Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={registering?'new-password':'current-password'} style={styles.input}/>
      {registering?<Text style={styles.intro}>Use at least 12 characters and at most 72 UTF-8 bytes. Some emojis use several bytes.</Text>:null}
      <Pressable accessibilityRole="button" disabled={pending||account.loading||Platform.OS!=='web'} onPress={()=>void login()} style={styles.save}><Text style={styles.saveText}>{pending?'Please wait…':registering?'Create account and sign in':'Sign in'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={pending} onPress={()=>{setRegistering(!registering);setMessage('');setPassword('');}} style={styles.cancel}><Text style={styles.cancelText}>{registering?'I already have an account':'Create an account'}</Text></Pressable>
    </>}
    {account.authNotice?<Text accessibilityLiveRegion="polite" style={styles.intro}>{account.authNotice}</Text>:null}
    {message?<Text accessibilityRole="alert" style={styles.intro}>{message}</Text>:null}
    {account.error?<Text accessibilityRole="alert" style={styles.intro}>{account.error}</Text>:null}
    {account.loading?<Text accessibilityLiveRegion="polite" style={styles.intro}>Loading your account…</Text>:null}
    <Pressable accessibilityRole="button" onPress={()=>router.replace('/')} style={styles.cancel}><Text style={styles.cancelText}>Back to Home</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
