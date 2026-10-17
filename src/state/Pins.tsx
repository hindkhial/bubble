import { useAccount } from './Account';
import { useLocalState } from '../storage/useLocalState';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useContent } from './Content';

const MAX_PINS = 3;
type PinState = Record<string, string[]>;
type PinsContextValue = {
  storageError: string | null;
  pinsFor: (scopeId: string) => string[];
  togglePin: (scopeId: string, key: string) => boolean | Promise<boolean>;
};

const PinsContext = createContext<PinsContextValue | null>(null);

export function PinsProvider({children}: PropsWithChildren) {
  const account=useAccount();
  if(account.mode === 'account')return <PinsContext.Provider value={{storageError: account.error || null,pinsFor:()=>account.pins.map(id=>`file:${id}`),togglePin:async(_scope,key)=>{const item=account.items.find(item=>`file:${item.id}`===key);if(!item)return false;await account.pin(item);return true;}}}>{children}</PinsContext.Provider>;
  return <LocalPins>{children}</LocalPins>;
}
function LocalPins({ children }: PropsWithChildren) {
  const [pins, setPins, storageError, pinsLoaded, commitPins] = useLocalState<PinState>('bubble.pins.v1', () => ({}), (value): value is PinState => !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every((keys) => Array.isArray(keys) && keys.every((key) => typeof key === 'string')));
  const { bubbles, items, hydrated, storageError: contentError } = useContent();

  useEffect(() => {
    if (!hydrated || !pinsLoaded || contentError || storageError) return;
    const live = new Set([...bubbles.map((bubble) => `bubble:${bubble.id}`), ...items.map((item) => `file:${item.id}`)]);
    const scopes = new Set(['root', ...bubbles.map((bubble) => bubble.id)]);
    setPins((previous) => {
      let changed = false;
      const next: PinState = {};
      for (const [scope, keys] of Object.entries(previous)) {
        if (!scopes.has(scope)) { changed = true; continue; }
        const filtered = keys.filter((key) => live.has(key));
        if (filtered.length !== keys.length) changed = true;
        next[scope] = filtered;
      }
      return changed ? next : previous;
    });
  }, [bubbles, items, hydrated, pinsLoaded, contentError, storageError]);

  const pinsFor = useCallback((scopeId: string) => pins[scopeId] ?? [], [pins]);
  const togglePin = useCallback((scopeId: string, key: string) => {
    const current = pins[scopeId] ?? [];
    if (!current.includes(key) && current.length >= MAX_PINS) return false;
    try { commitPins((previous) => {
      const existing = previous[scopeId] ?? [];
      return { ...previous, [scopeId]: existing.includes(key) ? existing.filter((pin) => pin !== key) : [...existing, key] };
    }); return true; } catch { return false; }
  }, [pins, commitPins]);

  const value = useMemo(() => ({ pinsFor, togglePin, storageError }), [pinsFor, togglePin, storageError]);
  return <PinsContext.Provider value={value}>{children}</PinsContext.Provider>;
}

export function usePins() {
  const context = useContext(PinsContext);
  if (!context) throw new Error('usePins must be used inside PinsProvider');
  return context;
}
