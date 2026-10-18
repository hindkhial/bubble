import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAccount } from '../state/Account';
import { localStorage } from '../storage/local';
import { readStored } from '../storage/browser';
import type { SampleItem } from '../data/sample';
import { useTheme } from '../theme/Theme';
import { createFormStyles } from './AddPreview';

export function NativeAccountSettings(){
 const account=useAccount();const {colors}=useTheme();const styles=createFormStyles(colors);const router=useRouter();
 const [items,setItems]=useState<SampleItem[]|null>(null);const [selected,setSelected]=useState<string[]>([]);
 const [owns,setOwns]=useState(false);const [confirmed,setConfirmed]=useState(false);const [message,setMessage]=useState('');const [pending,setPending]=useState(false);const running=useRef(false);
 const review=()=>{
  try{
   const storage=localStorage();if(!storage)throw new Error('Device storage is unavailable.');
   const values=readStored<SampleItem[]>(storage,'bubble.items.v1',[],(v):v is SampleItem[]=>Array.isArray(v)&&v.every(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&typeof x.body==='string'&&['NOTE','CHECKLIST','PHOTO'].includes(x.type)));
   setItems(values.filter(x=>x.type!=='PHOTO'));setSelected([]);setConfirmed(false);setOwns(false);setMessage('');
  }catch(error){setMessage(error instanceof Error?error.message:'Could not read device content. It remains unchanged.');}
 };
 const copy=async()=>{
  if(running.current||!owns||!confirmed||!account.user||!selected.length)return;
  running.current=true;setPending(true);setMessage('');
  try{
   const storage=localStorage();if(!storage)throw new Error('Device storage is unavailable.');
   const count=await account.importSelected(storage,(items??[]).filter(item=>selected.includes(item.id)));
   setSelected([]);setConfirmed(false);setMessage(`Verified ${count} new account copies. Previously verified copies were skipped. Every device original was kept.`);
  }catch(error){setMessage(error instanceof Error?error.message:'Could not verify the copy. Device originals remain unchanged.');}
  finally{running.current=false;setPending(false);}
 };
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><ScrollView contentContainerStyle={{padding:24,width:'100%',maxWidth:560,alignSelf:'center'}}>
  <Text accessibilityRole="header" style={styles.title}>Security</Text><Text style={styles.intro}>{account.user?.email}</Text>
  <Text style={styles.intro}>Your account Bubbles, notes, lists and photos are saved on the server. This version verifies your session online when opening or returning to Bubble. Account content is not cached in device SQLite.</Text>
  <Pressable accessibilityRole="button" disabled={pending} onPress={review} style={styles.cancel}><Text style={styles.cancelText}>Review existing device content</Text></Pressable>
  {items?<><Text accessibilityRole="header" style={styles.label}>Existing content found</Text><Text style={styles.intro}>{items.filter(x=>x.type==='NOTE').length} notes · {items.filter(x=>x.type==='CHECKLIST').length} checklists. Nothing has been assigned to this account or uploaded automatically.</Text>
   <Text style={styles.intro}>A confirmed transfer copies selected notes and checklists to {account.user?.email}. Device originals remain recoverable. Bubbles, photos, profile and device Appearance stay on this iPhone. This is a copy, not synchronization.</Text>
   <Pressable accessibilityRole="checkbox" accessibilityState={{checked:owns,disabled:pending}} accessibilityLabel="These device notes and checklists belong to me" disabled={pending} onPress={()=>{setOwns(!owns);setSelected([]);setConfirmed(false);}} style={[styles.cancel,{minHeight:48}]}><Text style={styles.cancelText}>{owns?'✓ ':''}These device notes and checklists belong to me</Text></Pressable>
   {owns?items.map(item=><Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={`Select ${item.title}`} accessibilityState={{checked:selected.includes(item.id),disabled:pending}} disabled={pending} onPress={()=>{setConfirmed(false);setSelected(current=>current.includes(item.id)?current.filter(id=>id!==item.id):[...current,item.id]);}} style={[styles.destinationChoice,{minHeight:44}]}><Text style={styles.destinationText}>{selected.includes(item.id)?'✓ ':''}{item.title} · {item.type==='NOTE'?'Note':'Checklist'}</Text></Pressable>):null}
   {!items.length?<Text style={styles.intro}>No device notes or checklists to copy.</Text>:null}
   {selected.length?<Pressable accessibilityRole="checkbox" accessibilityLabel="Confirm copying selected private content to this account" accessibilityState={{checked:confirmed,disabled:pending}} disabled={pending} onPress={()=>setConfirmed(!confirmed)} style={[styles.cancel,{minHeight:48}]}><Text style={styles.cancelText}>{confirmed?'✓ ':''}Copy {selected.length} selected items to {account.user?.email}</Text></Pressable>:null}
   {selected.length?<Pressable accessibilityRole="button" accessibilityState={{disabled:pending||!confirmed||!owns||account.busy,busy:pending}} disabled={pending||!confirmed||!owns||account.busy} onPress={()=>void copy()} style={styles.save}><Text style={styles.saveText}>{pending?'Verifying copies…':`Copy ${selected.length} selected items to my account`}</Text></Pressable>:null}
   <Text style={styles.intro}>Copies are marked complete only after being read back from your account. Known server IDs can be verified again after an interruption. An uncertain copy without a server ID is blocked from automatic retry to prevent duplicates; inspect your account before reconciliation. No local cleanup is performed.</Text>
  </>:null}
  {message||account.error?<Text accessibilityRole="alert" style={styles.intro}>{message||account.error}</Text>:null}
  <Pressable accessibilityRole="button" disabled={pending||account.busy} onPress={()=>router.push("./change-password")} style={[styles.cancel,{minHeight:48}]}><Text style={styles.cancelText}>Change Password</Text></Pressable>
  <Pressable accessibilityRole="button" disabled={pending} onPress={()=>router.replace('/')} style={styles.cancel}><Text style={styles.cancelText}>Back to Home</Text></Pressable>
 </ScrollView></SafeAreaView>;
}
