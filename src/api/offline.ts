import type { SampleItem } from '../data/sample';
export type OfflineSnapshot = { version: 1; owner: { id: string; email: string; displayName: string }; items: SampleItem[]; verifiedAt: number; cachedAt: number; remainingMs?:number; appearance?:{themeMode:'LIGHT'|'DARK'|'SYSTEM';accentColor:string} };
export type ProtectedDraft = { version: 1; id: string; kind: 'NOTE' | 'CHECKLIST'; title: string; body: string; rows: { id: string; text: string; done: boolean }[]; updatedAt: number; publication?:{state:'pending'|'confirmed';itemId?:string} };
export function parseSnapshot(json: string): OfflineSnapshot {
  const s = JSON.parse(json) as OfflineSnapshot;
  const remaining=s.remainingMs??0;
  if (s.version !== 1 || typeof s.owner?.id !== 'string' || typeof s.owner.email !== 'string' || typeof s.owner.displayName !== 'string' || !Number.isFinite(s.verifiedAt) || !Number.isFinite(s.cachedAt) || !Number.isFinite(remaining) || remaining<=0 || remaining>7*24*60*60*1000 || !Array.isArray(s.items) || !s.items.every(validItem)) throw new Error('Offline snapshot is unavailable or unsupported. Nothing was erased.');
  if(s.appearance&&(!['LIGHT','DARK','SYSTEM'].includes(s.appearance.themeMode)||!['Lavender','Rose','Sage','Deep lavender','Sky blue','Dusty pink','Denim blue'].includes(s.appearance.accentColor)))throw new Error('Cached appearance format is unsupported. Nothing was erased.');
  return s;
}
function validItem(i: SampleItem) {
  return i && i.image === undefined && typeof i.id === 'string' && ['NOTE', 'CHECKLIST'].includes(i.type) && typeof i.title === 'string' && typeof i.body === 'string' && typeof i.preview === 'string'
    && (i.rows === undefined || (Array.isArray(i.rows) && i.rows.every(r => typeof r.id === 'string' && typeof r.text === 'string' && typeof r.done === 'boolean')));
}
export function parseDraft(json: string): ProtectedDraft {
  const d = JSON.parse(json) as ProtectedDraft;
  if (d.version !== 1 || !/^[0-9a-f-]{36}$/i.test(d.id) || !['NOTE', 'CHECKLIST'].includes(d.kind) || typeof d.title !== 'string' || typeof d.body !== 'string' || !Number.isFinite(d.updatedAt) || !Array.isArray(d.rows) || !d.rows.every(r => typeof r.id === 'string' && typeof r.text === 'string' && typeof r.done === 'boolean')) throw new Error('A protected draft is corrupt or unsupported. Nothing was erased.');
  if(d.publication&&(!['pending','confirmed'].includes(d.publication.state)||(d.publication.state==='confirmed'&&typeof d.publication.itemId!=='string')))throw new Error('Draft publication state is invalid. Nothing was erased.');
  return d;
}
export function offlineResults(snapshot: OfflineSnapshot, query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return snapshot.items.filter(i => words.every(word => `${i.title}\n${i.body}\n${(i.rows ?? []).map(r => r.text).join('\n')}`.toLocaleLowerCase().includes(word)));
}
