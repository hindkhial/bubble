import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { browserStorage, readStored } from './browser';

export function useLocalState<T>(key: string, initial: () => T, validate: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>, string | null, boolean] {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const storage = browserStorage();
      if (storage) setValue(readStored(storage, key, initial(), validate));
      else setError('Browser storage is unavailable. Changes last for this session only.');
    } catch { setBlocked(true); setError('Local data could not be loaded. Stored data is unchanged; changes in this session will not be saved.'); }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded || blocked) return;
    try { const storage = browserStorage(); if (storage) storage.setItem(key, JSON.stringify(value)); }
    catch { setError('Could not save locally. Your changes are still available in this session.'); }
  }, [key, value, loaded, blocked]);
  return [value, setValue, error, loaded];
}
