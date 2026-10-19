export function profilePhotoUri(reference?: string) { return reference; }
export async function persistProfilePhoto(_previous: string | undefined, selected: string | undefined, commit: (reference: string | undefined) => void | Promise<void>) { await commit(selected); }
