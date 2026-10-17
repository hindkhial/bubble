import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { localStorage } from './local';
import { stateCell } from './stateCell';
export function useLocalState<T>(key: string, initial: () => T, validate: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>, string | null, boolean, Dispatch<SetStateAction<T>>] {
  // A storage key identifies a fixed schema/initializer, independent of render closures.
  const cell = useMemo(() => stateCell(key, initial(), validate, localStorage), [key]);
  const [value, setValue] = useState(cell.value);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoaded(false);
    try { setValue(cell.hydrate()); setError(null); }
    catch { setError('Local data could not be loaded. Stored data is unchanged; changes will not be saved.'); }
    setLoaded(true);
  }, [cell]);
  const commit = useCallback((next: SetStateAction<T>) => {
    try { const saved = cell.save(next); setValue(saved); setError(null); }
    catch (problem) { setError('Could not save locally. Existing saved data is unchanged.'); throw problem; }
  }, [cell]);
  const update: Dispatch<SetStateAction<T>> = useCallback(next => { try { commit(next); } catch { /* Owning screens surface storage errors. */ } }, [commit]);
  return [value, update, error, loaded, commit];
}
