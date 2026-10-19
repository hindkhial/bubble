import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPlacements, libraryBubble, libraryPhoto, libraryPages, HOME, ACCOUNT_IMAGE } from '../src/api/library.ts';
import { searchEverything } from '../src/utils/dashboard.ts';

const entry={id:'image-1',kind:'BUBBLE',title:'Mountain holiday',description:'Blue lake',parentId:null,color:'#E8DEF3',width:100,height:230,pinned:false,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z'};
test('account covers use private transport references and actual image proportions',()=>{
  const bubble=libraryBubble(entry);assert.equal(bubble.cardImageRatio,2.3);assert.equal(bubble.parentId,null);assert.equal(bubble.cover.uri,ACCOUNT_IMAGE+entry.id);
  const photo=libraryPhoto({...entry,kind:'PHOTO'});assert.equal(photo.bubbleId,HOME);assert.equal(photo.type,'PHOTO');assert.equal(photo.image.uri,ACCOUNT_IMAGE+entry.id);
});
test('unassigned notes and lists appear on Home; assignments survive reload without mutating originals',()=>{
  const items=[{id:'n',bubbleId:'account-library',title:'Note',type:'NOTE',body:'Text',order:1},{id:'l',bubbleId:'account-library',title:'List',type:'CHECKLIST',body:'',order:2}];
  const placed=applyPlacements(items,[{id:'p',noteId:'n',checklistId:null,bubbleId:'b'}]);
  assert.equal(placed[0].bubbleId,'b');assert.equal(placed[1].bubbleId,HOME);assert.equal(items[0].bubbleId,'account-library');
  assert.ok(applyPlacements(items,[]).every(item=>item.bubbleId===HOME));
});
test('search finds synced Bubble and photo descriptions with correct result kinds',()=>{
  const bubble=libraryBubble(entry),photo=libraryPhoto({...entry,id:'photo-2',kind:'PHOTO'});
  assert.deepEqual(searchEverything([bubble],[photo],'BLUE LAKE','All',new Set()).map(value=>value.kind),['bubble','file']);
  assert.equal(searchEverything([bubble],[photo],'lake','Bubbles',new Set()).length,1);
  assert.equal(searchEverything([bubble],[photo],'lake','Lists',new Set()).length,0);
});
test('library metadata is read across all pages without image bytes',async()=>{
  const paths=[];const api={request:async(_method,path)=>{paths.push(path);return {content:[{id:String(paths.length)}],totalPages:2};}};
  assert.equal((await libraryPages(api,'/library')).length,2);assert.deepEqual(paths,['/library?page=0','/library?page=1']);
});
