export type DashboardItem = { id: string; bubbleId: string; type: string; title: string; body: string; order: number; updatedAt?: number; rows?: { text: string; done: boolean }[] };
export type SearchFilter = 'All' | 'Notes' | 'Lists';
export const fileRoute = (id: string) => `/file/${encodeURIComponent(id)}` as const;
export function recentItems<T extends DashboardItem>(items: readonly T[]): T[] {
  return [...new Map(items.filter((item) => item.type === 'NOTE' || item.type === 'CHECKLIST').map((item) => [item.id, item])).values()]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.order - b.order || a.id.localeCompare(b.id));
}
export function pinnedFirst<T extends DashboardItem>(items: readonly T[], pins: ReadonlySet<string>): T[] {
  return recentItems(items).sort((a, b) => Number(pins.has(`file:${b.id}`)) - Number(pins.has(`file:${a.id}`)));
}
export function searchItems<T extends DashboardItem>(items: readonly T[], query: string, filter: SearchFilter, pins: ReadonlySet<string>): T[] {
  const term = query.trim().toLocaleLowerCase();
  return pinnedFirst(items, pins).filter((item) => {
    if (filter === 'Notes' && item.type !== 'NOTE') return false;
    if (filter === 'Lists' && item.type !== 'CHECKLIST') return false;
    const text = [item.title, item.type === 'NOTE' ? item.body : '', ...(item.rows ?? []).map((row) => row.text)].join('\n').toLocaleLowerCase();
    return !term || text.includes(term);
  });
}

export type SearchEntry<B, I> = { kind: 'bubble'; value: B } | { kind: 'file'; value: I };
export function searchEverything<B extends { id: string; title: string; description: string; order: number }, I extends DashboardItem & { preview?: string; meta?: string }>(bubbles: readonly B[], items: readonly I[], query: string, filter: SearchFilter | 'Bubbles', pins: ReadonlySet<string>): SearchEntry<B, I>[] {
  const term = query.trim().toLocaleLowerCase();
  const entries: SearchEntry<B, I>[] = [
    ...(filter === 'All' || filter === 'Bubbles' ? bubbles.filter((bubble) => [bubble.title, bubble.description].join('\n').toLocaleLowerCase().includes(term)).map((value) => ({ kind: 'bubble' as const, value })) : []),
    ...(filter === 'Bubbles' ? [] : items.filter((item) => {
      if (filter === 'Notes' && item.type !== 'NOTE') return false;
      if (filter === 'Lists' && item.type !== 'CHECKLIST') return false;
      return [item.title, item.body, item.preview ?? '', item.meta ?? '', ...(item.rows ?? []).map((row) => row.text)].join('\n').toLocaleLowerCase().includes(term);
    }).map((value) => ({ kind: 'file' as const, value }))),
  ];
  return [...new Map(entries.map((entry) => [`${entry.kind}:${entry.value.id}`, entry])).values()].sort((a, b) =>
    Number(pins.has(`${b.kind}:${b.value.id}`)) - Number(pins.has(`${a.kind}:${a.value.id}`)) || a.value.order - b.value.order || `${a.kind}:${a.value.id}`.localeCompare(`${b.kind}:${b.value.id}`));
}
