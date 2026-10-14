export interface ClientStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function browserStorage(): ClientStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}
export function readStored<T>(storage: ClientStorage, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  const value: unknown = JSON.parse(raw);
  if (!validate(value)) throw new Error('Stored data could not be read. It has been kept unchanged.');
  return value;
}
