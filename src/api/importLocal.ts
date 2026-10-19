import { ApiError } from './client.ts';
import type { SampleItem } from '../data/sample.ts';
import type { ClientStorage } from '../storage/browser.ts';
import type { AccountRepository } from './account.ts';
export function importLedgerKey(base: string, userId: string) { return `bubble.account-import.v1:${encodeURIComponent(base)}:${userId}`; }
export async function copyLocalItems(repository: AccountRepository, storage: ClientStorage, userId: string, selected: SampleItem[], verify?: (remoteId: string, item: SampleItem) => Promise<void>) {
  const eligible=selected.filter(item=>item.type==='NOTE'||item.type==='CHECKLIST');
  if(!eligible.every(item=>item && typeof item.id==='string' && item.id.length>0 && typeof item.title==='string' && typeof item.body==='string' && (item.type!=='CHECKLIST'||(item.rows===undefined||Array.isArray(item.rows)&&item.rows.every(row=>row&&typeof row.id==='string'&&typeof row.text==='string'&&typeof row.done==='boolean')))))throw new Error('Local content could not be validated. Nothing was copied.');
  if(new Set(eligible.map(item=>item.id)).size!==eligible.length)throw new Error('Local content has duplicate IDs. Nothing was copied; resolve the duplicates first.');
  const key=importLedgerKey(repository.api.base,userId);
  const raw=storage.getItem(key);
  const ledger: Record<string,{state:'pending'|'complete';remoteId?:string}> = raw ? JSON.parse(raw) : {};
  if(!ledger || typeof ledger!=='object' || Array.isArray(ledger) || !Object.values(ledger).every(entry=>entry && ['pending','complete'].includes(entry.state) && (entry.state!=='complete'||typeof entry.remoteId==='string')))throw new Error('The copy history is unreadable. Nothing was uploaded.');
  let copied=0;
  for(const item of selected) {
    if(item.type!=='NOTE' && item.type!=='CHECKLIST')continue;
    if(ledger[item.id]?.state==='complete')continue;
    if(ledger[item.id]){
      if(verify && typeof ledger[item.id].remoteId==='string'){
        await verify(ledger[item.id].remoteId!,item);
        ledger[item.id]={state:'complete',remoteId:ledger[item.id].remoteId};storage.setItem(key,JSON.stringify(ledger));continue;
      }
      throw new Error('A previous copy has an uncertain result. Inspect your account before copying this item again.');
    }
    ledger[item.id]={state:'pending'};storage.setItem(key,JSON.stringify(ledger));
    let createdOnServer=false;
    try {
      const created=item.type==='NOTE' ? await repository.saveNote({title:item.title,body:item.body}) : await repository.saveChecklist({title:item.title,rows:(item.rows??[]).map(row=>({...row,id:'local-'+row.id}))});
      createdOnServer=true;
      if(verify){ledger[item.id]={state:'pending',remoteId:created.id};storage.setItem(key,JSON.stringify(ledger));await verify(created.id,item);}
      ledger[item.id]={state:'complete',remoteId:created.id};storage.setItem(key,JSON.stringify(ledger));copied++;
    } catch(error) {
      // A definite validation/auth rejection did not create content. Unknown outcomes remain pending.
      if(!createdOnServer && error instanceof ApiError && !error.uncertain && error.status>=400 && error.status<500) {delete ledger[item.id];storage.setItem(key,JSON.stringify(ledger));}
      throw error;
    }
  }
  return copied;
}
export async function verifyAccountCopy(repository: AccountRepository, remoteId: string, source: SampleItem) {
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(remoteId))throw new Error('The account returned an invalid copy ID. Device originals are unchanged.');
  const checklist=source.type==='CHECKLIST';
  const saved=await repository.api.request<import('./account.ts').ServerItem>('GET',`/${checklist?'checklists':'notes'}/${remoteId}`);
  const title=source.title.trim()||(checklist?'Untitled checklist':'Untitled note');
  const rows=(source.rows??[]).filter(row=>row.text.trim());
  if(saved.id!==remoteId||saved.title!==title||(!checklist&&saved.content!==source.body)||
    (checklist&&(!Array.isArray(saved.items)||saved.items.length!==rows.length||saved.items.some((row,i)=>row.content!==rows[i].text||row.completed!==rows[i].done))))
    throw new Error('The account copy did not match the original. Nothing local was removed; review the account copy before continuing.');
}
