import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

const MAX_PINS = 3;
type PinState = Record<string, string[]>;
type PinsContextValue = {
  pinsFor: (scopeId: string) => string[];
  togglePin: (scopeId: string, key: string) => boolean;
};

const PinsContext = createContext<PinsContextValue | null>(null);

export function PinsProvider({ children }: PropsWithChildren) {
  const [pins, setPins] = useState<PinState>({});

  const pinsFor = useCallback((scopeId: string) => pins[scopeId] ?? [], [pins]);
  const togglePin = useCallback((scopeId: string, key: string) => {
    const current = pins[scopeId] ?? [];
    if (!current.includes(key) && current.length >= MAX_PINS) return false;
    setPins((previous) => {
      const existing = previous[scopeId] ?? [];
      return { ...previous, [scopeId]: existing.includes(key) ? existing.filter((pin) => pin !== key) : [...existing, key] };
    });
    return true;
  }, [pins]);

  const value = useMemo(() => ({ pinsFor, togglePin }), [pinsFor, togglePin]);
  return <PinsContext.Provider value={value}>{children}</PinsContext.Provider>;
}

export function usePins() {
  const context = useContext(PinsContext);
  if (!context) throw new Error('usePins must be used inside PinsProvider');
  return context;
}
