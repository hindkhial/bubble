import { ApiClient, ApiError } from './client.ts';
import type { ChecklistRow, SampleItem } from '../data/sample.ts';
export type Account = { id: string; email: string; displayName: string; createdAt: string };
export type ServerProfile = { displayName: string; bio: string | null; avatarReference: string | null; createdAt: string; updatedAt: string };
export function profileChanges(current: ServerProfile, next: {displayName: string;bio: string;avatarReference?: string | null}) {
  const patch: {displayName?: string;bio?: string;avatarReference?: string | null} = {};
  if(next.displayName!==current.displayName)patch.displayName=next.displayName;
  if(next.bio!==(current.bio??''))patch.bio=next.bio;
  if((next.avatarReference??null)!==current.avatarReference)patch.avatarReference=next.avatarReference??null;
  return patch;
}
export type Preferences = { themeMode: 'LIGHT' | 'DARK' | 'SYSTEM'; accentColor: string };
export type ServerItem = { id: string; title: string; content?: string; pinned: boolean; createdAt: string; updatedAt: string; items?: {id: string; content: string; completed: boolean; position: number}[] };
type Page<T> = {content: T[]; totalPages: number};
export const ACCOUNT_LIBRARY = 'account-library';
export function toItem(value: ServerItem, checklist = false): SampleItem {
  return {id: value.id, bubbleId: ACCOUNT_LIBRARY, type: checklist ? 'CHECKLIST' : 'NOTE', title: value.title, body: value.content ?? '', preview: (value.content ?? '').slice(0,160), meta: 'Account · Saved on server', order: -Date.parse(value.updatedAt), createdAt: Date.parse(value.createdAt), updatedAt: Date.parse(value.updatedAt), rows: value.items?.map(row => ({id: row.id, text: row.content, done: row.completed}))};
}
export class AccountRepository {
  api: ApiClient;
  constructor(api: ApiClient) { this.api = api; }
  register(email: string, password: string, displayName: string) { return this.api.request<Account>('POST','/auth/register',{email,password,displayName}); }
  async login(email: string, password: string) { try {const result = await this.api.request<Account>('POST','/auth/login',{email,password}); this.api.resetCsrf(); return result;}catch(error){if(error instanceof ApiError && error.status===401)throw new ApiError('Email or password is incorrect.',401);throw error;} }
  async logout() { await this.api.request('POST','/auth/logout'); this.api.resetCsrf(); }
  me() { return this.api.request<Account>('GET','/users/me'); }
  async pages(path: string, size = 100, signal?: AbortSignal): Promise<ServerItem[]> {
    const result: ServerItem[] = [];
    for (let page = 0; ; page++) {
      const value = await this.api.request<Page<ServerItem>>('GET',path + (path.includes('?') ? '&' : '?') + `size=${size}&page=${page}`, undefined, signal);
      result.push(...value.content);
      if (page + 1 >= value.totalPages) break;
    }
    return [...new Map(result.map(value => [value.id, value])).values()];
  }
  async content(q = '', signal?: AbortSignal) {
    const suffix = q ? '&q='+encodeURIComponent(q) : '';
    const [notes, lists] = await Promise.all([this.pages('/notes'+(q?'?q='+encodeURIComponent(q):''),100,signal),
      this.pages('/checklists?includeItems=true'+suffix,20,signal)]);
    // Older backends ignore includeItems. Never turn their missing rows into an empty editable list.
    const detailed=[...lists];
    for(let start=0;start<lists.length;start+=10) await Promise.all(lists.slice(start,start+10).map(async(list,index)=>{
      if(!Array.isArray(list.items)) detailed[start+index]=await this.api.request<ServerItem>('GET','/checklists/'+list.id,undefined,signal);
    }));
    if(detailed.some(list=>!Array.isArray(list.items))) throw new ApiError('The account returned incomplete checklist items. Refresh before editing.');
    return {items: [...notes.map(value => toItem(value)), ...detailed.map(value => toItem(value,true))], pinned: [...notes,...lists].filter(value => value.pinned).map(value => value.id)};
  }
  async saveNote(input: {title: string; body: string}, id?: string) {
    return toItem(await this.api.request<ServerItem>(id ? 'PATCH' : 'POST','/notes'+(id ? '/'+id : ''),{title: input.title.trim() || 'Untitled note', content: input.body}));
  }
  async saveChecklist(input: {title: string; rows: ChecklistRow[]}, id?: string) {
    const items = input.rows.filter(row => row.text.trim()).map(row => ({
      id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(row.id) ? row.id : null, content: row.text, completed: row.done,
    }));
    return toItem(await this.api.request<ServerItem>(id ? 'PUT' : 'POST', id ? `/checklists/${id}/content` : '/checklists/with-items', {title: input.title.trim() || 'Untitled checklist',items}),true);
  }
}
