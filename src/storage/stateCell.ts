import { readStored, type ClientStorage } from './browser.ts';
export function stateCell<T>(key: string, initial: T, validate: (value: unknown) => value is T, storage: () => ClientStorage | null) {
  let value = initial;
  let ready = false;
  let blocked = false;
  return {
    get value() { return value; },
    hydrate() {
      if (ready) return value;
      try {
        const store = storage();
        if (!store) throw new Error('Local storage is unavailable.');
        value = readStored(store, key, initial, validate);
        ready = true;
        return value;
      } catch (error) { blocked = true; throw error; }
    },
    save(next: T | ((previous: T) => T)) {
      if (!ready || blocked) throw new Error('Local data could not be loaded. Existing data has been kept unchanged.');
      const candidate = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
      if (!validate(candidate)) throw new Error('Invalid local data.');
      const store = storage();
      if (!store) throw new Error('Local storage is unavailable.');
      store.setItem(key, JSON.stringify(candidate));
      value = candidate;
      return value;
    },
  };
}
