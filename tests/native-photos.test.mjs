import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceProfilePhoto, ownedPhotoName, validatePickedImage } from '../src/storage/profilePhotoCore.ts';
function fixture(){const files=new Map([['profile-aaa.jpg','old']]);return {files,adapter:{exists:n=>files.has(n),copy:(source,n)=>files.set(n,source),remove:n=>files.delete(n),nameFromUri:()=>undefined}};}
test('photo reference commits before old image is removed; removal clears saved reference first',async()=>{
 const {files,adapter}=fixture();let saved;
 await replaceProfilePhoto('bubble-photo:profile-aaa.jpg','file:///temporary.jpg',adapter,()=> 'profile-bbb.jpg',reference=>{assert.ok(files.has('profile-aaa.jpg'));assert.ok(files.has('profile-bbb.jpg'));saved=reference;});
 assert.equal(saved,'bubble-photo:profile-bbb.jpg');assert.equal(files.has('profile-aaa.jpg'),false);
 await replaceProfilePhoto(saved,undefined,adapter,()=>assert.fail(),reference=>{assert.equal(reference,undefined);assert.ok(files.has('profile-bbb.jpg'));});assert.equal(files.size,0);
});
test('failed profile commit rolls back new image and keeps previous saved photo',async()=>{
 const {files,adapter}=fixture();await assert.rejects(replaceProfilePhoto('bubble-photo:profile-aaa.jpg','file:///new.jpg',adapter,()=> 'profile-bbb.jpg',()=>{throw Error('disk full');}));assert.deepEqual([...files.keys()],['profile-aaa.jpg']);
});
test('malformed/remote/missing images never cause deletion of unowned files',async()=>{
 const {files,adapter}=fixture();assert.equal(ownedPhotoName('bubble-photo:../private'),undefined);
 await assert.rejects(replaceProfilePhoto(undefined,'https://example.com/photo',adapter,()=>assert.fail(),()=>assert.fail()));
 await assert.rejects(replaceProfilePhoto(undefined,'bubble-photo:profile-missing.jpg',adapter,()=>assert.fail(),()=>assert.fail()));
 assert.equal(files.size,1);
});
test('copy failure removes partial destination, and no-copy save survives reopening an owned reference',async()=>{
 const {files,adapter}=fixture();const fail={...adapter,copy:(_s,n)=>{files.set(n,'partial');throw Error('copy failed');}};
 await assert.rejects(replaceProfilePhoto('bubble-photo:profile-aaa.jpg','file:///new.jpg',fail,()=> 'profile-bbb.jpg',()=>assert.fail()));assert.equal(files.size,1);
 await replaceProfilePhoto('bubble-photo:profile-aaa.jpg','bubble-photo:profile-aaa.jpg',adapter,()=>assert.fail(),reference=>assert.equal(reference,'bubble-photo:profile-aaa.jpg'));assert.equal(files.size,1);
});
test('selection validates image metadata, dimensions and size',()=>{
 const valid={uri:'file:///photo.jpg',type:'image',mimeType:'image/jpeg',width:50,height:50,fileSize:200};validatePickedImage(valid);
 for(const input of [{...valid,type:'video'},{...valid,width:NaN},{...valid,fileSize:11*1024*1024},{...valid,height:0}])assert.throws(()=>validatePickedImage(input));
});
