export type AuthFields = {email: string; password: string; displayName?: string; confirmation?: string};
export function normalizedEmail(value: string) { return value.trim().toLowerCase(); }
function utf8Length(value:string){return [...value].reduce((size,character)=>{const point=character.codePointAt(0)!;return size+(point<=0x7f?1:point<=0x7ff?2:point<=0xffff?3:4);},0);}
export function validateAuthentication(fields: AuthFields, registering: boolean): string | null {
  const email = normalizedEmail(fields.email);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!fields.password) return 'Enter your password.';
  if (registering) {
    if (!fields.displayName?.trim() || fields.displayName.trim().length > 80) return 'Enter a display name of up to 80 characters.';
    if ([...fields.password].length < 12 || utf8Length(fields.password) > 72) return 'Use at least 12 characters and at most 72 UTF-8 bytes for your password.';
    if (fields.password !== fields.confirmation) return 'The passwords do not match.';
  }
  return null;
}

export function validatePasswordChange(current: string, next: string, confirmation: string): string | null {
  if (!current) return 'Enter your current password.';
  if ([...next].length < 12 || utf8Length(next) > 72) return 'Use at least 12 characters and at most 72 UTF-8 bytes for your new password.';
  if (next !== confirmation) return 'The new passwords do not match.';
  if (current === next) return 'Choose a new password different from your current password.';
  return null;
}
