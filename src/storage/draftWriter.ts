import type { ProtectedDraft } from '../api/offline';

// Serialize revisions and deletion. A failed write must not poison later saves.
export function draftWriter(save:(draft:ProtectedDraft)=>Promise<void>, remove:(id:string)=>Promise<void>) {
  let queue=Promise.resolve();
  return {
    save(draft:ProtectedDraft){const immutable=JSON.parse(JSON.stringify(draft)) as ProtectedDraft;const result=queue.then(()=>save(immutable));queue=result.catch(()=>{});return result;},
    remove(id:string){const result=queue.then(()=>remove(id));queue=result.catch(()=>{});return result;},
  };
}
