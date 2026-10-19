import type { Bubble, SampleItem } from '../data/sample.ts';
import type { ApiClient } from './client.ts';
export const HOME = 'root';
export const ACCOUNT_IMAGE = 'bubble-account-image:';
export type LibraryEntry = {id:string;kind:'BUBBLE'|'PHOTO';title:string;description:string;parentId:string|null;color:string;width:number;height:number;pinned:boolean;createdAt:string;updatedAt:string};
export type Placement = {id:string;bubbleId:string;noteId:string|null;checklistId:string|null};
export function libraryBubble(entry:LibraryEntry):Bubble {
  return {id:entry.id,title:entry.title,description:entry.description,parentId:entry.parentId,color:entry.color,cover:{uri:ACCOUNT_IMAGE+entry.id},cardImageRatio:entry.height/entry.width,order:Date.parse(entry.createdAt)};
}
export function libraryPhoto(entry:LibraryEntry):SampleItem {
  return {id:entry.id,title:entry.title,body:entry.description,preview:entry.description,type:'PHOTO',bubbleId:entry.parentId??HOME,image:{uri:ACCOUNT_IMAGE+entry.id},cardImageRatio:entry.height/entry.width,order:Date.parse(entry.createdAt),createdAt:Date.parse(entry.createdAt),updatedAt:Date.parse(entry.updatedAt),meta:'Photo · Saved to your account'};
}
export function applyPlacements(items:SampleItem[],placements:Placement[]):SampleItem[] {
  const destinations=new Map(placements.map(value=>[value.noteId??value.checklistId,value.bubbleId]));
  return items.map(item=>({...item,bubbleId:destinations.get(item.id)??HOME}));
}
export async function libraryPages<T>(api:ApiClient,path:string):Promise<T[]> {
  const values:T[]=[];
  for(let page=0;;page++){
    const result=await api.request<{content:T[];totalPages:number}>('GET',path+'?page='+page);
    values.push(...result.content);if(page+1>=result.totalPages)break;
  }
  return values;
}
