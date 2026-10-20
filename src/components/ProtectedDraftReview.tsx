import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MotionAwareModal } from './MotionAwareModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount, configuredApi } from '../state/Account';
import { useTheme } from '../theme/Theme';
import { protectedDrafts, saveProtectedDraft, removeProtectedDraft } from '../api/transport';
import type { ProtectedDraft } from '../api/offline';

export function ProtectedDraftReview(){
  const account=useAccount();const {colors}=useTheme();const insets=useSafeAreaInsets();
  const [open,setOpen]=useState(false);const [drafts,setDrafts]=useState<ProtectedDraft[]>([]);const [selected,setSelected]=useState<ProtectedDraft|null>(null);const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const epoch=useRef(0);const publishing=useRef(false);useEffect(()=>()=>{epoch.current++;},[]);
  const [discardConfirm,setDiscardConfirm]=useState(false);
  const owner=account.user?.id??'';const base=configuredApi();
  const load=async()=>{
    const ticket=epoch.current;setBusy(true);setError('');setDiscardConfirm(false);
    try{const values=await protectedDrafts(base,owner);if(ticket===epoch.current){setDrafts(values);setOpen(true);setSelected(null);}}
    catch{setError('Protected drafts could not be read. Keys and files were preserved.');}
    finally{if(ticket===epoch.current)setBusy(false);}
  };
  const publish=async()=>{
    if(!selected||publishing.current||selected.publication)return;
    if(selected.kind==='NOTE'?!selected.body.trim():!selected.rows.some(r=>r.text.trim())){setError('This draft has no content to publish. Nothing was sent.');return;}
    publishing.current=true;setBusy(true);setError('');
    const ticket=epoch.current;
    // Persist the uncertainty marker BEFORE HTTP. Interrupted requests never auto-retry.
    const pending:ProtectedDraft={...selected,publication:{state:'pending'}};
    try{
      await saveProtectedDraft(base,owner,pending);
      if(ticket!==epoch.current)return; // Never continue a confirmation across authentication unmount/relaunch.
      setSelected(pending);setDrafts(values=>values.map(d=>d.id===pending.id?pending:d));setConfirm(false);
      const result=await account.publishDraftCopy(owner,selected);
      if(ticket!==epoch.current)return; // Retain pending if a request was interrupted after dispatch.
      const receipt:ProtectedDraft={...pending,publication:{state:'confirmed',itemId:result.id}};
      await saveProtectedDraft(base,owner,receipt);setSelected(receipt);setDrafts(values=>values.map(d=>d.id===receipt.id?receipt:d));
    }catch{setError('Publishing was not confirmed. Review Home after reconnecting before taking further action. The protected draft is retained; no automatic retry will occur.');}
    finally{publishing.current=false;setBusy(false);}
  };
  const button=(label:string,action:()=>void)=><Pressable accessibilityRole="button" accessibilityState={{disabled:busy}} disabled={busy} onPress={action} style={{minHeight:48,padding:12,borderRadius:24,justifyContent:'center',backgroundColor:colors.lavenderSoft}}><Text style={{color:colors.action}}>{label}</Text></Pressable>;
  return <>
    {button('Review protected drafts',()=>void load())}
    {!open&&error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}
    <MotionAwareModal visible={open} transparent animationType="slide" onRequestClose={()=>{if(!busy)setOpen(false);}}>
      <View style={{flex:1,backgroundColor:colors.background,paddingTop:insets.top,paddingBottom:insets.bottom}} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={{padding:24,gap:12}}>
          <Text accessibilityRole="header" style={{fontSize:24,color:colors.text}}>Protected drafts</Text>
          {button('Close',()=>{setOpen(false);setDrafts([]);setSelected(null);})}
          {selected?<>
            <Text style={{color:colors.text,fontSize:20}}>{selected.title||'Untitled draft'}</Text>
            <Text selectable style={{color:colors.text}}>{selected.kind==='NOTE'?selected.body:selected.rows.map(r=>`${r.done?'☑':'☐'} ${r.text}`).join('\n')}</Text>
            {selected.publication?<Text accessibilityRole="alert" style={{color:colors.muted}}>{selected.publication.state==='confirmed'?`A new copy was saved (${selected.publication.itemId}).`:'A previous publication may have reached the server. Inspect Home; this draft will not be retried.'}</Text>:<>
              <Text style={{color:colors.muted}}>This is a local draft, not saved server content. Publishing creates a new copy on Home and never changes the original.</Text>
              {confirm?<>{button('Confirm: publish a new copy to my account',()=>void publish())}{button('Cancel publication',()=>setConfirm(false))}</>:button('Publish as a new copy…',()=>setConfirm(true))}
            </>}
            {discardConfirm?<>
              <Text style={{color:colors.destructive}}>Discard only this protected draft? Server content will not be deleted. If publication was uncertain, inspect Home first.</Text>
              {button('Confirm: discard this protected draft',()=>{setBusy(true);void removeProtectedDraft(base,owner,selected.id).then(()=>load()).catch(()=>setError('Draft could not be removed. Nothing else changed.')).finally(()=>setBusy(false));})}
              {button('Keep protected draft',()=>setDiscardConfirm(false))}
            </>:button('Discard protected draft…',()=>setDiscardConfirm(true))}
            {button('Back to draft list',()=>{setConfirm(false);void load();})}
          </>:<>{!drafts.length?<Text style={{color:colors.muted}}>No protected drafts for this account.</Text>:drafts.map(d=> <View key={d.id}>{button(`Review ${d.title||'untitled '+d.kind.toLowerCase()}`,()=>{setSelected(d);setConfirm(false);})}</View>)}</>}
          {error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}
        </ScrollView>
      </View>
    </MotionAwareModal>
  </>;
}
