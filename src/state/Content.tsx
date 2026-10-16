import { useAccount } from './Account';
import { ACCOUNT_LIBRARY } from '../api/account';
import { useLocalState } from '../storage/useLocalState';
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { Bubble, ChecklistRow, CollectionEntry, SampleItem } from '../data/sample';

type NewBubble = { title: string; description: string; parentId: string | null; color: string; cover?: ImageSourcePropType; cardImageRatio?: number };
type NewNote = { title: string; body: string; bubbleId: string };
type NewPhoto = { title: string; description: string; bubbleId: string; image: ImageSourcePropType; cardImageRatio: number };
type ChecklistChanges = { title: string; rows: ChecklistRow[] };
type NewChecklist = ChecklistChanges & { bubbleId: string };
type BubbleChanges = { title: string; description: string; color: string };
type NoteChanges = { title: string; body: string };
type ContentContextValue = {
  hydrated: boolean;
  storageError: string | null;
  bubbles: Bubble[];
  items: SampleItem[];
  bubbleById: (id: string) => Bubble | undefined;
  itemById: (id: string) => SampleItem | undefined;
  childBubbles: (parentId: string | null) => Bubble[];
  bubbleCountLabel: (id: string) => string;
  collectionContents: (id: string) => CollectionEntry[];
  createBubble: (input: NewBubble) => Bubble;
  createNote: (input: NewNote) => SampleItem | Promise<SampleItem>;
  createPhoto: (input: NewPhoto) => SampleItem;
  createChecklist: (input: NewChecklist) => SampleItem | Promise<SampleItem>;
  updateBubble: (id: string, changes: BubbleChanges) => void;
  updateNote: (id: string, changes: NoteChanges) => void | Promise<unknown>;
  updateChecklist: (id: string, changes: ChecklistChanges) => void | Promise<unknown>;
  toggleChecklistRow: (itemId: string, rowId: string) => void | Promise<unknown>;
  deleteBubble: (id: string) => void;
  deleteNote: (id: string) => void | Promise<unknown>;
  deleteChecklist: (id: string) => void | Promise<unknown>;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({children}: PropsWithChildren) {
  const account=useAccount();
  return account.mode === 'account' ? <RemoteContent>{children}</RemoteContent> : <LocalContent>{children}</LocalContent>;
}
function RemoteContent({children}: PropsWithChildren) {
  const account=useAccount();
  const bubble: Bubble = {id:ACCOUNT_LIBRARY,title:'Account library',description:'Notes and checklists saved to your account. Bubbles and photos stay local.',parentId:null,order:0,cardImageRatio:1};
  const unsupported = (): never => {throw new Error('Bubbles and photos are available in local mode only.');};
  const value: ContentContextValue = {
    hydrated: !account.loading, storageError: account.error || (account.mode === 'account' && !account.user ? 'Sign in from You → Account, or use local mode.' : null),
    bubbles: [bubble], items: account.items, bubbleById: id=>id===ACCOUNT_LIBRARY?bubble:undefined,
    itemById: id=>account.items.find(item=>item.id===id),childBubbles: parent=>parent===null?[bubble]:[],
    bubbleCountLabel: ()=>`${account.items.length} files`,collectionContents: ()=>[...account.items].sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(value=>({kind:'file',value})),
    createBubble:unsupported,createPhoto:unsupported,updateBubble:unsupported,deleteBubble:unsupported,
    createNote:input=>account.saveNote(input),createChecklist:input=>account.saveChecklist(input),
    updateNote:(id,input)=>account.saveNote(input,id),updateChecklist:(id,input)=>account.saveChecklist(input,id),
    toggleChecklistRow:async(id,rowId)=>{const item=account.items.find(item=>item.id===id);const row=item?.rows?.find(row=>row.id===rowId);if(!item||!row)return;
      await account.saveChecklist({title:item.title,rows:(item.rows??[]).map(value=>value.id===rowId?{...value,done:!value.done}:value)},id);},
    deleteNote:async id=>{const item=account.items.find(item=>item.id===id);if(item)await account.remove(item);},
    deleteChecklist:async id=>{const item=account.items.find(item=>item.id===id);if(item)await account.remove(item);},
  };
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
function LocalContent({ children }: PropsWithChildren) {
  const [bubbles, setBubbles, bubblesError, bubblesLoaded] = useLocalState<Bubble[]>('bubble.bubbles.v1', () => [], (value): value is Bubble[] => Array.isArray(value) && value.every((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.order === 'number'));
  const [items, setItems, itemsError, itemsLoaded] = useLocalState<SampleItem[]>('bubble.items.v1', () => [], (value): value is SampleItem[] => Array.isArray(value) && value.every((entry) => entry && typeof entry.id === 'string' && typeof entry.bubbleId === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string' && typeof entry.order === 'number' && ['NOTE', 'PHOTO', 'CHECKLIST'].includes(entry.type) && (entry.rows === undefined || (Array.isArray(entry.rows) && entry.rows.every((row: { text?: unknown; done?: unknown }) => row && typeof row.text === 'string' && typeof row.done === 'boolean')))));
  const sequence = useRef(0);

  const value = useMemo<ContentContextValue>(() => {
    const childBubbles = (parentId: string | null) => bubbles.filter((bubble) => bubble.parentId === parentId);
    const bubbleItems = (bubbleId: string) => items.filter((item) => item.bubbleId === bubbleId);
    return {
      hydrated: bubblesLoaded && itemsLoaded,
      storageError: bubblesError || itemsError,
      bubbles,
      items,
      bubbleById: (id) => bubbles.find((bubble) => bubble.id === id),
      itemById: (id) => items.find((item) => item.id === id),
      childBubbles,
      bubbleCountLabel: (id) => {
        const children = childBubbles(id).length;
        const files = bubbleItems(id).length;
        return `${children} ${children === 1 ? 'Bubble' : 'Bubbles'} · ${files} ${files === 1 ? 'file' : 'files'}`;
      },
      collectionContents: (id) => [
        ...childBubbles(id).map((bubble): CollectionEntry => ({ kind: 'bubble', value: bubble })),
        ...bubbleItems(id).map((item): CollectionEntry => ({ kind: 'file', value: item })),
      ].sort((a, b) => a.value.order - b.value.order || a.value.id.localeCompare(b.value.id)),
      createBubble: ({ title, description, parentId, color, cover, cardImageRatio }) => {
        const bubble: Bubble = {
          id: `new-bubble-${Date.now()}-${++sequence.current}`,
          title: title.trim(), description: description.trim(), parentId, color, cover,
          order: Date.now() + sequence.current / 1000, cardImageRatio: cardImageRatio ?? 1,
        };
        setBubbles((current) => [...current, bubble]);
        return bubble;
      },
      createNote: ({ title, body, bubbleId }) => {
        const cleanBody = body.trim();
        const item: SampleItem = {
          id: `new-note-${Date.now()}-${++sequence.current}`,
          createdAt: Date.now(), updatedAt: Date.now(), bubbleId, type: 'NOTE', order: Date.now() + sequence.current / 1000,
          title: title.trim() || 'Untitled note',
          preview: cleanBody.replace(/\s+/g, ' ').slice(0, 160),
          body: cleanBody, meta: 'Note · Just now',
        };
        setItems((current) => [...current, item]);
        return item;
      },
      createPhoto: ({ title, description, bubbleId, image, cardImageRatio }) => {
        const item: SampleItem = {
          id: `new-photo-${Date.now()}-${++sequence.current}`,
          createdAt: Date.now(), updatedAt: Date.now(), bubbleId, type: 'PHOTO', order: Date.now() + sequence.current / 1000,
          title: title.trim() || 'Untitled photo',
          preview: description.trim(), body: description.trim(),
          meta: 'Photo · Just now', image, cardImageRatio,
        };
        setItems((current) => [...current, item]);
        return item;
      },
      createChecklist: ({ title, rows, bubbleId }) => {
        const item: SampleItem = {
          id: `new-checklist-${Date.now()}-${++sequence.current}`,
          createdAt: Date.now(), updatedAt: Date.now(), bubbleId, type: 'CHECKLIST', order: Date.now() + sequence.current / 1000,
          title: title.trim() || 'Untitled checklist', preview: '', body: '',
          meta: 'Checklist · Just now', rows: rows.filter((row) => row.text.trim()).map((row) => ({ ...row })),
        };
        setItems((current) => [...current, item]);
        return item;
      },
      updateBubble: (id, changes) => setBubbles((current) => current.map((bubble) =>
        bubble.id === id ? { ...bubble, title: changes.title.trim(), description: changes.description.trim(), color: changes.color } : bubble)),
      updateNote: (id, changes) => setItems((current) => current.map((item) => {
        if (item.id !== id || item.type !== 'NOTE') return item;
        const body = changes.body.trim();
        return { ...item, updatedAt: Date.now(), title: changes.title.trim() || 'Untitled note', body, preview: body.replace(/\s+/g, ' ').slice(0, 160) };
      })),
      updateChecklist: (id, changes) => setItems((current) => current.map((item) =>
        item.id === id && item.type === 'CHECKLIST'
          ? { ...item, updatedAt: Date.now(), title: changes.title.trim() || 'Untitled checklist', rows: changes.rows.filter((row) => row.text.trim()).map((row) => ({ ...row })) }
          : item)),
      toggleChecklistRow: (itemId, rowId) => setItems((current) => current.map((item) =>
        item.id === itemId && item.type === 'CHECKLIST'
          ? { ...item, updatedAt: Date.now(), rows: (item.rows ?? []).map((row) => row.id === rowId ? { ...row, done: !row.done } : row) }
          : item)),
      deleteBubble: (id) => {
        const descendants = new Set([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const bubble of bubbles) {
            if (bubble.parentId && descendants.has(bubble.parentId) && !descendants.has(bubble.id)) {
              descendants.add(bubble.id);
              changed = true;
            }
          }
        }
        setBubbles((current) => current.filter((bubble) => !descendants.has(bubble.id)));
        setItems((current) => current.filter((item) => !descendants.has(item.bubbleId)));
      },
      deleteNote: (id) => setItems((current) => current.filter((item) => item.id !== id || item.type !== 'NOTE')),
      deleteChecklist: (id) => setItems((current) => current.filter((item) => item.id !== id || item.type !== 'CHECKLIST')),
    };
  }, [bubbles, items, bubblesError, itemsError, bubblesLoaded, itemsLoaded]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return context;
}
