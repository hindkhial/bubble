type CreationDraft = {
  text: readonly string[];
  hasImage: boolean;
  changedColor: boolean;
  rows: readonly { text: string; done: boolean }[];
  hasPendingBubble: boolean;
};

// The initial editor has one empty checklist row. Protect edits even when the
// draft is not valid enough to save yet, including staged destination Bubbles.
export function hasCreationDraft(draft: CreationDraft): boolean {
  return draft.text.some(value => value.length > 0) || draft.hasImage ||
    draft.changedColor || draft.hasPendingBubble || draft.rows.length !== 1 ||
    draft.rows.some(row => row.text.length > 0 || row.done);
}
