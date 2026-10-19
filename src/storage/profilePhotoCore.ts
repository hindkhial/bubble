export const PHOTO_PREFIX = 'bubble-photo:';
const fileName = /^profile-[a-f0-9-]+\.jpg$/;
export interface PhotoFiles {
  copy(source: string, name: string): void;
  exists(name: string): boolean;
  remove(name: string): void;
  nameFromUri(uri: string): string | undefined;
}
export function ownedPhotoName(reference?: string): string | undefined {
  const name = reference?.startsWith(PHOTO_PREFIX) ? reference.slice(PHOTO_PREFIX.length) : '';
  return fileName.test(name) ? name : undefined;
}
export async function replaceProfilePhoto(previous: string | undefined, selected: string | undefined, files: PhotoFiles, newName: () => string, commit: (reference: string | undefined) => void | Promise<void>) {
  const oldName = ownedPhotoName(previous) ?? (previous ? files.nameFromUri(previous) : undefined);
  let created: string | undefined;
  let nextName: string | undefined;
  if (selected) {
    nextName = ownedPhotoName(selected) ?? files.nameFromUri(selected);
    if (nextName) {
      if (!fileName.test(nextName) || !files.exists(nextName)) throw new Error('This profile photo is unavailable. Choose it again.');
    } else {
      if (!selected.startsWith('file://')) throw new Error('Choose a local image from Photos.');
      created = newName();
      if (!fileName.test(created) || files.exists(created)) throw new Error('Could not allocate a profile photo.');
      try { files.copy(selected, created); }
      catch (error) { try { files.remove(created); } catch { /* Never delete an unowned source. */ } throw error; }
      nextName = created;
    }
  }
  try { await commit(nextName ? PHOTO_PREFIX + nextName : undefined); }
  catch (error) { if (created) { try { files.remove(created); } catch { /* Retain an orphan rather than risk saved content. */ } } throw error; }
  // Removal cannot undo a committed profile. A failed cleanup leaves an unreferenced owned file, never a broken saved reference.
  if (oldName && oldName !== nextName && fileName.test(oldName)) { try { files.remove(oldName); } catch { /* Best-effort owned-file cleanup only. */ } }
}
export function validatePickedImage(asset: { uri: string; type?: string | null; mimeType?: string | null; width: number; height: number; fileSize?: number }) {
  if (!asset.uri || (asset.type && asset.type !== 'image') || (asset.mimeType && !asset.mimeType.startsWith('image/')) || !Number.isFinite(asset.width) || !Number.isFinite(asset.height) || asset.width <= 0 || asset.height <= 0 || (asset.fileSize !== undefined && (asset.fileSize <= 0 || asset.fileSize > 10 * 1024 * 1024))) throw new Error('Choose an image up to 10 MB.');
}
