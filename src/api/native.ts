import { apiBase } from './client.ts';
export function nativeApiBase(value?: string): string {
  if (!value) return ''; // Local-only does not require a configured server.
  const base = apiBase(value);
  if (new URL(base).protocol !== 'https:') throw new Error('Native account connections require HTTPS.');
  return base;
}
