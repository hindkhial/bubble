import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCreationDraft } from '../src/utils/creationDraft.ts';

const empty = () => ({ text: Array(7).fill(''), hasImage: false, changedColor: false,
  rows: [{ text: '', done: false }], hasPendingBubble: false });

test('opening an untouched creation form does not require discard confirmation', () => {
  assert.equal(hasCreationDraft(empty()), false);
});
test('every title/body/description field protects an incomplete creation draft', () => {
  for (let index = 0; index < 7; index++) {
    const draft = empty(); draft.text[index] = 'Incomplete draft';
    assert.equal(hasCreationDraft(draft), true);
  }
});
test('image, color and staged destination changes cannot be silently discarded', () => {
  for (const field of ['hasImage', 'changedColor', 'hasPendingBubble']) {
    assert.equal(hasCreationDraft({ ...empty(), [field]: true }), true);
  }
});
test('checklist text, completion and structural edits protect the draft', () => {
  for (const rows of [[{ text: 'Task', done: false }], [{ text: '', done: true }],
    [], [{ text: '', done: false }, { text: '', done: false }]]) {
    assert.equal(hasCreationDraft({ ...empty(), rows }), true);
  }
});
