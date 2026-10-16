import type { CollectionEntry } from '../data/sample';

export function orderCollectionEntries(entries: readonly CollectionEntry[], scopeId: string,
  respectEntryScopes: boolean, pinsFor: (scope: string) => readonly string[]) {
  const scopes = new Set(respectEntryScopes ? entries.map(entry =>
    entry.kind === 'bubble' ? entry.value.parentId ?? 'root' : entry.value.bubbleId) : [scopeId]);
  const ranks = new Map<string, number>();
  for (const scope of scopes) for (const key of pinsFor(scope)) {
    if (!ranks.has(key)) ranks.set(key, ranks.size);
  }
  const ordered = [...entries].sort((a, b) =>
    (ranks.get(`${a.kind}:${a.value.id}`) ?? Infinity) - (ranks.get(`${b.kind}:${b.value.id}`) ?? Infinity) || 0);
  return { ordered, pins: new Set(ranks.keys()) };
}
