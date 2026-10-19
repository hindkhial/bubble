import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ownedPhotoName, replaceProfilePhoto } from './profilePhotoCore';
const folder = () => new Directory(Paths.document, 'profile-photos');
export function profilePhotoUri(reference?: string) {
  const name = ownedPhotoName(reference);
  if (!name) return reference;
  const file = new File(folder(), name);
  return file.exists ? file.uri : undefined;
}
export async function persistProfilePhoto(previous: string | undefined, selected: string | undefined, commit: (reference: string | undefined) => void | Promise<void>) {
  const directory = folder();
  directory.create({ intermediates: true, idempotent: true });
  await replaceProfilePhoto(previous, selected, {
    exists: name => new File(directory, name).exists,
    nameFromUri: uri => {
      const prefix = directory.uri.replace(/\/$/, '') + '/';
      if (!uri.startsWith(prefix)) return undefined;
      const name = uri.slice(prefix.length);
      return ownedPhotoName('bubble-photo:' + name);
    },
    copy: (source, name) => {
      const file = new File(source);
      if (!file.exists || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('The selected photo is unavailable or too large.');
      file.copy(new File(directory, name));
    },
    remove: name => { const file = new File(directory, name); if (file.exists) file.delete(); },
  }, () => `profile-${randomUUID()}.jpg`, commit);
}
