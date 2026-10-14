export const DISPLAY_NAME_LIMIT = 80;
export const BIO_LIMIT = 160;

export function validateProfile(displayName: string, bio: string): string | null {
  if (!displayName.trim()) return 'Please enter a display name.';
  if (displayName.trim().length > DISPLAY_NAME_LIMIT) return `Keep your display name within ${DISPLAY_NAME_LIMIT} characters.`;
  if (bio.trim().length > BIO_LIMIT) return `Keep your bio within ${BIO_LIMIT} characters.`;
  return null;
}

export function profileInitials(name: string) {
  return (Array.from(name.trim())[0] ?? '•').toLocaleUpperCase();
}

export function profileActivity(items: readonly unknown[], bubbles: readonly unknown[]) {
  return { notes: items.length, bubbles: bubbles.length };
}
