import type { ImageSourcePropType } from 'react-native';

export type Bubble = {
  id: string;
  title: string;
  description: string;
  parentId: string | null;
  order: number;
  cover?: ImageSourcePropType;
  color?: string;
  cardImageRatio: number;
};

export type SampleItem = {
  id: string;
  bubbleId: string;
  type: 'NOTE' | 'PHOTO' | 'CHECKLIST';
  order: number;
  title: string;
  preview: string;
  body: string;
  meta: string;
  createdAt?: number;
  updatedAt?: number;
  image?: ImageSourcePropType;
  cardImageRatio?: number;
  rows?: ChecklistRow[];
};

export type ChecklistRow = { id: string; text: string; done: boolean };
let rowSequence = 0;
export const newChecklistRow = (): ChecklistRow => ({ id: `row-${Date.now()}-${++rowSequence}`, text: '', done: false });
export const checklistProgress = (rows: ChecklistRow[]) => ({ done: rows.filter((row) => row.done).length, total: rows.length });

export const bubbles: Bubble[] = [
  { id: 'books', title: 'Books', description: 'Stories to stay with a little longer.', parentId: null, order: 10, cover: require('../../assets/covers/books.png'), cardImageRatio: 1.18 },
  { id: 'journal', title: 'Journal', description: 'Little moments, kept close.', parentId: null, order: 20, cover: require('../../assets/covers/journal.png'), cardImageRatio: 0.82 },
  { id: 'travel', title: 'Travel', description: 'Places I have been and hope to go.', parentId: null, order: 30, cover: require('../../assets/covers/travel.png'), cardImageRatio: 1.1 },
  { id: 'study', title: 'Study', description: 'Notes for curious days.', parentId: null, order: 40, cover: require('../../assets/covers/study.png'), cardImageRatio: 0.9 },
  { id: 'white-nights', title: 'White Nights', description: 'A small collection of thoughts on the story.', parentId: 'books', order: 10, cover: require('../../assets/covers/white-nights.png'), cardImageRatio: 1.12 },
  { id: 'reading-list', title: 'Reading List', description: 'What I want to read next.', parentId: 'books', order: 40, cover: require('../../assets/covers/reading-list.png'), cardImageRatio: 0.82 },
  { id: 'summer-trip', title: 'Summer Trip', description: 'Slow days by the sea.', parentId: 'travel', order: 10, cover: require('../../assets/covers/summer-trip.png'), cardImageRatio: 1.2 },
];

export const items: SampleItem[] = [
  { id: 'book-note', bubbleId: 'books', type: 'NOTE', order: 20, title: 'The stories we keep', preview: 'A few lines from this morning’s reading, and the thoughts I want to return to…', body: 'A few lines from this morning’s reading, and the thoughts I want to return to.\n\nI keep finding that the smallest details stay with me longest: the place where I stopped, a sentence that made me pause, and the feeling of wanting to tell someone about it. This Bubble is where those little moments can live together.\n\nWhen I finish a book, I want to come back here and remember more than the plot. I want to remember what it felt like to read it.', meta: 'Note · Sep 18' },
  { id: 'book-photo', bubbleId: 'books', type: 'PHOTO', order: 30, title: 'A quiet reading moment', preview: 'A favorite afternoon with a book.', body: 'A favorite afternoon with a book and a warm cup of tea.\n\nI can keep a description here, along with any links or details I want to remember about what is in the photo.\n\nBook list: https://example.com/reading-list', meta: 'Photo · Sep 17', image: require('../../assets/covers/books.png'), cardImageRatio: 1.36 },
  { id: 'book-link', bubbleId: 'books', type: 'NOTE', order: 50, title: 'A reading corner', preview: 'A quiet place to collect recommendations and ideas.', body: 'A quiet place to collect recommendations and ideas.\n\nI can paste a link into this note whenever I find something worth returning to.\n\nReading list: https://example.com/reading-list', meta: 'Note · Sep 12' },
  { id: 'white-note', bubbleId: 'white-nights', type: 'NOTE', order: 10, title: 'After the last page', preview: 'Some endings feel like a beginning. I want to remember how this one felt.', body: 'Some endings feel like a beginning. I want to remember how this one felt.\n\nThe story stayed with me after I closed the book. I kept thinking about the quiet moments between the characters, and about how memory can make even a brief encounter feel enormous.', meta: 'Note · Sep 16' },
  { id: 'reading-checklist', bubbleId: 'reading-list', type: 'NOTE', order: 10, title: 'Next on the shelf', preview: '□ A gentle novel   □ Poems for autumn', body: 'Books I want to read next:\n\n□ A gentle novel\n□ Poems for autumn\n□ Something recommended by a friend', meta: 'Note · Sep 10' },
  { id: 'travel-note', bubbleId: 'travel', type: 'NOTE', order: 20, title: 'Places for later', preview: 'The little streets, fresh air, and long unplanned afternoons.', body: 'The little streets, fresh air, and long unplanned afternoons.\n\nI want to leave space for the places I find by accident, the cafés I wander into, and the views I wish I could keep.', meta: 'Note · Sep 8' },
  { id: 'travel-video', bubbleId: 'travel', type: 'NOTE', order: 30, title: 'A place to revisit', preview: 'A saved idea for a future trip.', body: 'A saved idea for a future trip.\n\nI can paste a video or travel link into this note and add my own thoughts underneath it.', meta: 'Note · Sep 7' },
  { id: 'study-note', bubbleId: 'study', type: 'NOTE', order: 10, title: 'TypeScript ideas', preview: 'A few patterns to practice in my next project.', body: 'A few patterns to practice in my next project.\n\nStart with the small pieces: clearer types, reusable functions, and examples I can revisit when I get stuck.', meta: 'Note · Sep 6' },
];

export const bubbleById = (id: string) => bubbles.find((bubble) => bubble.id === id);
export const childBubbles = (parentId: string | null) => bubbles.filter((bubble) => bubble.parentId === parentId);
export const bubbleItems = (bubbleId: string) => items.filter((item) => item.bubbleId === bubbleId);
export const itemById = (id: string) => items.find((item) => item.id === id);
export const bubbleCounts = (bubbleId: string) => ({ bubbles: childBubbles(bubbleId).length, files: bubbleItems(bubbleId).length });
export const bubbleCountLabel = (bubbleId: string) => {
  const count = bubbleCounts(bubbleId);
  return `${count.bubbles} ${count.bubbles === 1 ? 'Bubble' : 'Bubbles'} · ${count.files} ${count.files === 1 ? 'file' : 'files'}`;
};

export type CollectionEntry = { kind: 'bubble'; value: Bubble } | { kind: 'file'; value: SampleItem };
export const collectionContents = (bubbleId: string): CollectionEntry[] => [
  ...childBubbles(bubbleId).map((value): CollectionEntry => ({ kind: 'bubble', value })),
  ...bubbleItems(bubbleId).map((value): CollectionEntry => ({ kind: 'file', value })),
].sort((a, b) => a.value.order - b.value.order || a.value.id.localeCompare(b.value.id));
