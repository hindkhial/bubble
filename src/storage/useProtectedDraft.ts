import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useAccount, configuredApi } from '../state/Account';
import { saveProtectedDraft, removeProtectedDraft } from '../api/transport';
import { draftWriter } from './draftWriter';
import type { ChecklistRow } from '../data/sample';
import type { ProtectedDraft } from '../api/offline';

export function useProtectedDraft(enabled:boolean, kind:'NOTE'|'CHECKLIST', title:string, body:string, rows:ChecklistRow[]) {
  const account=useAccount();const owner=account.user?.id??'';const base=configuredApi();
  const [id,setId]=useState(()=>randomUUID());const [status,setStatus]=useState('');const revision=useRef(0);
  const queued=useRef(false);
  const writer=useMemo(()=>draftWriter(d=>saveProtectedDraft(base,owner,d),id=>removeProtectedDraft(base,owner,id)),[base,owner]);
  const serialized=JSON.stringify({kind,title,body,rows});
  useEffect(()=>{
    if(Platform.OS!=='ios'||!enabled||!owner||!account.nativeVerified)return;
    const ticket=++revision.current;setStatus('Protecting draft…');
    queued.current=true;
    const d={version:1,id,...JSON.parse(serialized),updatedAt:Date.now()} as ProtectedDraft;
    void writer.save(d).then(()=>{if(ticket===revision.current)setStatus('Draft protected on this iPhone.');},()=>{if(ticket===revision.current)setStatus('Draft protection failed. Keep this editor open; your latest changes may not be recoverable.');});
    return ()=>{revision.current++;};
  },[enabled,owner,account.nativeVerified,id,serialized,writer]);
  return {status,finish:async()=>{if(Platform.OS==='ios'&&owner&&queued.current)await writer.remove(id);queued.current=false;setId(randomUUID());setStatus('');}};
}
