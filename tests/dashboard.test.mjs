import test from 'node:test';
import assert from 'node:assert/strict';
import { recentItems, pinnedFirst, searchItems, fileRoute } from '../src/utils/dashboard.ts';
import { readStored } from '../src/storage/browser.ts';
const note = (id, updatedAt, title = id, body = '') => ({ id, updatedAt, title, body, bubbleId: 'b', type: 'NOTE', order: 1 });
const items = [note('a', 20, 'Reading', 'Quiet MORNING'), note('b', 30), { ...note('c', 10, 'Groceries'), type: 'CHECKLIST', rows: [{ text: 'Buy APPLES', done: false }] }];
test('recent ordering is stable, deduplicated and follows edits', () => {
  assert.deepEqual(recentItems([...items, items[0]]).map(x => x.id), ['b','a','c']);
  assert.deepEqual(recentItems([note('b', 10), note('a', 10)]).map(x => x.id), ['a','b']);
  assert.equal(recentItems([{...items[0], updatedAt:40},...items.slice(1)])[0].id,'a');
});
test('pins lead search results while recent ordering stays chronological', () => {
  assert.deepEqual(pinnedFirst(items,new Set(['file:c'])).map(x=>x.id),['c','b','a']);
  assert.deepEqual(recentItems(items).map(x=>x.id),['b','a','c']);
});
test('search titles, body and checklist rows case-insensitively with filters', () => {
  assert.equal(searchItems(items,'reading','All',new Set())[0].id,'a');
  assert.equal(searchItems(items,'morning','Notes',new Set())[0].id,'a');
  assert.equal(searchItems(items,'apples','Lists',new Set())[0].id,'c');
  assert.equal(searchItems(items,'apples','Notes',new Set()).length,0);
  assert.equal(searchItems(items,'','Notes',new Set()).length,2);
  assert.equal(searchItems(items,'','Lists',new Set()).length,1);
  assert.equal(searchItems(items,'missing','All',new Set()).length,0);
  assert.deepEqual(searchItems([],'','All',new Set()),[]);
  assert.equal(searchItems([{...items[0],body:'new phrase'}],'phrase','All',new Set()).length,1);
});
test('result routes identify the existing file screen', () => { assert.equal(fileRoute('a'),'\/file/a'); assert.equal(fileRoute('a/b'),'/file/a%2Fb'); });
test('storage round trip preserves content, empty data and timestamps', () => {
  const store = new Map(); const storage = {getItem: k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  assert.deepEqual(readStored(storage,'x',[],Array.isArray),[]);
  storage.setItem('x',JSON.stringify(items));
  assert.deepEqual(readStored(storage,'x',[],Array.isArray),items);
  storage.setItem('x','[]'); assert.deepEqual(readStored(storage,'x',items,Array.isArray),[]);
  storage.setItem('x','{"broken":true}'); assert.throws(()=>readStored(storage,'x',[],Array.isArray)); assert.equal(storage.getItem('x'),'{"broken":true}');
});

test('searchEverything includes Bubble descriptions, photos, and all saved text without duplicates', async () => {
  const { searchEverything } = await import('../src/utils/dashboard.ts');
  const bubbles = [{ id:'space',title:'Travel',description:'Seaside memories',order:1 }];
  const photo = {...note('photo',1,'Sunset','Orange horizon'),type:'PHOTO',preview:'Salt air',meta:'Photo · October'};
  assert.equal(searchEverything(bubbles,items,'SEASIDE','All',new Set())[0].kind,'bubble');
  assert.equal(searchEverything(bubbles,[photo,photo],'salt','All',new Set()).length,1);
  assert.equal(searchEverything(bubbles,[photo],'orange','All',new Set())[0].value.id,'photo');
  assert.equal(searchEverything(bubbles,[photo],'october','All',new Set()).length,1);
  assert.equal(searchEverything(bubbles,items,'','Bubbles',new Set()).length,1);
  assert.equal(searchEverything(bubbles,items,'apples','Lists',new Set())[0].value.id,'c');
  assert.equal(searchEverything(bubbles,items,'','All',new Set(['file:c']))[0].value.id,'c');
});
