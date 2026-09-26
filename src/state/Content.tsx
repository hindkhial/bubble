import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { bubbles as seedBubbles, items as seedItems } from '../data/sample';
import type { Bubble, CollectionEntry, SampleItem } from '../data/sample';

type NewBubble = { title: string; description: string; parentId: string | null; color: string; cover?: ImageSourcePropType; cardImageRatio?: number };
type NewNote = { title: string; body: string; bubbleId: string };
type NewPhoto = { title: string; description: string; bubbleId: string; image: ImageSourcePropType; cardImageRatio: number };
type ContentContextValue = {
  bubbles: Bubble[];
  bubbleById: (id: string) => Bubble | undefined;
  itemById: (id: string) => SampleItem | undefined;
  childBubbles: (parentId: string | null) => Bubble[];
  bubbleCountLabel: (id: string) => string;
  collectionContents: (id: string) => CollectionEntry[];
  createBubble: (input: NewBubble) => Bubble;
  createNote: (input: NewNote) => SampleItem;
  createPhoto: (input: NewPhoto) => SampleItem;
};

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: PropsWithChildren) {
  const [createdBubbles, setCreatedBubbles] = useState<Bubble[]>([]);
  const [createdItems, setCreatedItems] = useState<SampleItem[]>([]);
  const sequence = useRef(0);
  const bubbles = useMemo(() => [...seedBubbles, ...createdBubbles], [createdBubbles]);
  const items = useMemo(() => [...seedItems, ...createdItems], [createdItems]);

  const value = useMemo<ContentContextValue>(() => {
    const childBubbles = (parentId: string | null) => bubbles.filter((bubble) => bubble.parentId === parentId);
    const bubbleItems = (bubbleId: string) => items.filter((item) => item.bubbleId === bubbleId);
    return {
      bubbles,
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
        setCreatedBubbles((current) => [...current, bubble]);
        return bubble;
      },
      createNote: ({ title, body, bubbleId }) => {
        const cleanBody = body.trim();
        const item: SampleItem = {
          id: `new-note-${Date.now()}-${++sequence.current}`,
          bubbleId, type: 'NOTE', order: Date.now() + sequence.current / 1000,
          title: title.trim() || 'Untitled note',
          preview: cleanBody.replace(/\s+/g, ' ').slice(0, 160),
          body: cleanBody, meta: 'Note · Just now',
        };
        setCreatedItems((current) => [...current, item]);
        return item;
      },
      createPhoto: ({ title, description, bubbleId, image, cardImageRatio }) => {
        const item: SampleItem = {
          id: `new-photo-${Date.now()}-${++sequence.current}`,
          bubbleId, type: 'PHOTO', order: Date.now() + sequence.current / 1000,
          title: title.trim() || 'Untitled photo',
          preview: description.trim(), body: description.trim(),
          meta: 'Photo · Just now', image, cardImageRatio,
        };
        setCreatedItems((current) => [...current, item]);
        return item;
      },
    };
  }, [bubbles, items]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used inside ContentProvider');
  return context;
}
