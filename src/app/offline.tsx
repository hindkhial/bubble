import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '../state/Account';
import { useTheme } from '../theme/Theme';
import { FileCard } from '../components/FileCard';
import { offlineResults } from '../api/offline';
import type { SampleItem } from '../data/sample';

export default function OfflineReader(){
  const account=useAccount();const {colors}=useTheme();
  const [query,setQuery]=useState('');const [selected,setSelected]=useState<SampleItem|null>(null);const [error,setError]=useState('');
  const snapshot=account.offlineSnapshot;if(!snapshot)return null;
  const action=(label:string,onPress:()=>void)=><Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:48,justifyContent:'center',padding:12,backgroundColor:colors.lavenderSoft,borderRadius:24}}><Text style={{color:colors.action}}>{label}</Text></Pressable>;
  const results=offlineResults(snapshot,query);
  return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}>
    <ScrollView contentContainerStyle={{padding:24,gap:16}} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={{fontSize:24,fontWeight:'700',color:colors.text}}>Offline—locally unlocked</Text>
      <Text style={{color:colors.muted}}>Read-only · {snapshot.owner.email}{'\n'}Cached copy: {new Date(snapshot.cachedAt).toLocaleString()}{'\n'}Account last verified online: {new Date(snapshot.verifiedAt).toLocaleString()}. No network requests are made here.</Text>
      {selected?<>
        {action('Back to cached notes',()=>setSelected(null))}
        <Text accessibilityRole="header" style={{fontSize:22,color:colors.text}}>{selected.title}</Text>
        {selected.type==='CHECKLIST'?(selected.rows??[]).map(row=><Text key={row.id} accessibilityLabel={`${row.done?'Completed':'Not completed'}: ${row.text}`} style={{color:colors.text,fontSize:17}}>{row.done?'☑':'☐'} {row.text}</Text>):<Text selectable style={{color:colors.text,fontSize:17,lineHeight:26}}>{selected.body}</Text>}
      </>:<>
        <TextInput accessibilityLabel="Search cached notes and checklists" value={query} onChangeText={setQuery} placeholder="Search cached notes and checklists" placeholderTextColor={colors.muted} style={{minHeight:48,borderRadius:24,padding:14,color:colors.text,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1}}/>
        {action('Clear search',()=>setQuery(''))}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{results.map(item=><View key={item.id} style={{flexBasis:'46%',flexGrow:1,maxWidth:'49%'}}><FileCard item={item} pinned={false} onOpenActions={()=>{}} onRead={()=>setSelected(item)}/></View>)}</View>
        {!results.length?<Text style={{color:colors.muted}}>{query?'No cached matches.':'No notes or checklists were cached at the last verification.'}</Text>:null}
      </>}
      {action('Lock and return to online sign in',()=>void account.lockOffline())}
      {action('Log Out',()=>void account.logout().catch(()=>setError('Could not finish signing out. Local access has been locked; do not assume server logout succeeded.')))}
      {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}
    </ScrollView>
  </SafeAreaView>;
}
