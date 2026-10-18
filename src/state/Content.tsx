import { useAccount } from './Account';
import { HOME, libraryBubble, libraryPhoto } from '../api/library';
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
  createBubble: (input: NewBubble) => Bubble | Promise<Bubble>;
  createNote: (input: NewNote) => SampleItem | Promise<SampleItem>;
  createPhoto: (input: NewPhoto) => SampleItem | Promise<SampleItem>;
  createChecklist: (input: NewChecklist) => SampleItem | Promise<SampleItem>;
  updateBubble: (id: string, changes: BubbleChanges) => void | Promise<unknown>;
  updateNote: (id: string, changes: NoteChanges) => void | Promise<unknown>;
  updateChecklist: (id: string, changes: ChecklistChanges) => void | Promise<unknown>;
  toggleChecklistRow: (itemId: string, rowId: string) => void | Promise<unknown>;
  deleteBubble: (id: string) => void | Promise<unknown>;
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
  const bubbles=account.library.filter(entry=>entry.kind==='BUBBLE').map(libraryBubble);
  const imageData=(source:ImageSourcePropType|undefined)=>{
    const uri=source&&typeof source==='object'&&!Array.isArray(source)&&'uri' in source?source.uri:undefined;
    if(!uri||!/^data:image\/(jpeg|png);base64,/.test(uri))throw new Error('Choose a JPEG or PNG photo again before saving.');
    const image=uri.slice(uri.indexOf(',')+1);
    if(image.length>699052)throw new Error('Choose a smaller photo (up to 512 KB) for account storage.');
    return image;
  };
  const value: ContentContextValue = {
    hydrated: !account.loading, storageError: account.error || (account.mode === 'account' && !account.user ? 'Sign in from You → Account, or use local mode.' : null),
    bubbles, items: account.items, bubbleById:id=>bubbles.find(bubble=>bubble.id===id),
    itemById:id=>account.items.find(item=>item.id===id),childBubbles:parent=>bubbles.filter(bubble=>bubble.parentId===parent),
    bubbleCountLabel:id=>`${bubbles.filter(bubble=>bubble.parentId===id).length} Bubbles · ${account.items.filter(item=>item.bubbleId===id).length} files`,
    collectionContents:id=>[...bubbles.filter(bubble=>bubble.parentId===id).map((value):CollectionEntry=>({kind:'bubble',value})),...account.items.filter(item=>item.bubbleId===id).map((value):CollectionEntry=>({kind:'file',value}))].sort((a,b)=>a.value.order-b.value.order||a.value.id.localeCompare(b.value.id)),
    createBubble:async input=>libraryBubble(await account.createLibrary({kind:'BUBBLE',title:input.title,description:input.description,parentId:input.parentId,color:input.color,image:imageData(input.cover)})),
    createPhoto:async input=>libraryPhoto(await account.createLibrary({kind:'PHOTO',title:input.title.trim()||'Untitled photo',description:input.description,parentId:input.bubbleId===HOME?null:input.bubbleId,color:'#E8DEF3',image:imageData(input.image)})),
    updateBubble:(id,input)=>account.updateLibrary(id,input),deleteBubble:id=>account.deleteLibrary(id),
    createNote:input=>account.saveNote(input),createChecklist:input=>account.saveChecklist(input),
    updateNote:(id,input)=>{const entry=account.library.find(value=>value.id===id&&value.kind==='PHOTO');return entry?account.updateLibrary(id,{title:input.title,description:input.body,color:entry.color}):account.saveNote(input,id);},updateChecklist:(id,input)=>account.saveChecklist(input,id),
    toggleChecklistRow:async(id,rowId)=>{const item=account.items.find(item=>item.id===id);const row=item?.rows?.find(row=>row.id===rowId);if(!item||!row)return;
      await account.saveChecklist({title:item.title,rows:(item.rows??[]).map(value=>value.id===rowId?{...value,done:!value.done}:value)},id);},
    deleteNote:async id=>{const item=account.items.find(item=>item.id===id);if(item)await account.remove(item);},
    deleteChecklist:async id=>{const item=account.items.find(item=>item.id===id);if(item)await account.remove(item);},
  };
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
function LocalContent({ children }: PropsWithChildren) {
  const [bubbles, , bubblesError, bubblesLoaded, setBubbles] = useLocalState<Bubble[]>('bubble.bubbles.v1', () => [], (value): value is Bubble[] => Array.isArray(value) && value.every((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.order === 'number'));
  const [items, , itemsError, itemsLoaded, setItems] = useLocalState<SampleItem[]>('bubble.items.v1', () => [], (value): value is SampleItem[] => Array.isArray(value) && value.every((entry) => entry && typeof entry.id === 'string' && typeof entry.bubbleId === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string' && typeof entry.order === 'number' && ['NOTE', 'PHOTO', 'CHECKLIST'].includes(entry.type) && (entry.rows === undefined || (Array.isArray(entry.rows) && entry.rows.every((row: { text?: unknown; done?: unknown }) => row && typeof row.text === 'string' && typeof row.done === 'boolean')))));
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
        if (item.id !== id || (item.type !== 'NOTE'&&item.type !== 'PHOTO')) return item;
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
      deleteNote: (id) => setItems((current) => current.filter((item) => item.id !== id || (item.type !== 'NOTE'&&item.type !== 'PHOTO'))),
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
