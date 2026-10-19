import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { localStorage } from '../storage/local';
import { useTheme } from '../theme/Theme';
export function DeviceContentNotice(){
 const {colors}=useTheme();const router=useRouter();const [summary,setSummary]=useState('');
 useEffect(()=>{
  if(Platform.OS!=='ios')return;
  try{
   const raw=localStorage()?.getItem('bubble.items.v1');if(!raw)return;
   const items:unknown=JSON.parse(raw);if(!Array.isArray(items)||items.some(x=>!x||typeof x.type!=='string'))throw new Error('Invalid local content');
   const notes=items.filter(x=>x.type==='NOTE').length;const lists=items.filter(x=>x.type==='CHECKLIST').length;
   if(notes||lists)setSummary(`${notes} device notes · ${lists} checklists found. Originals remain separate.`);
  }catch{setSummary('Existing device content could not be read. It has been kept unchanged.');}
 },[]);
 if(!summary)return null;
 return <View style={{backgroundColor:colors.surface,paddingHorizontal:20,paddingVertical:8}}><Text style={{color:colors.text,fontSize:13}}>{summary}</Text><Pressable accessibilityRole="button" accessibilityLabel="Review existing device content and transfer options" onPress={()=>router.push('/account')} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.action}}>Review in account settings</Text></Pressable></View>;
}
