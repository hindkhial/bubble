import { apiBase } from './client.ts';
export function nativeApiBase(value?: string): string {
  if (!value) return ''; // Local-only does not require a configured server.
  const base = apiBase(value);
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.pathname !== '/') throw new Error('Native account connections require an HTTPS origin without a path.');
  return base;
}
