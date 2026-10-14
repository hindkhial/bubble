import test from 'node:test';
import assert from 'node:assert/strict';
import { profileActivity, profileInitials, validateProfile, BIO_LIMIT, DISPLAY_NAME_LIMIT } from '../src/utils/profile.ts';

test('activity handles empty content', () => {
  assert.deepEqual(profileActivity([], []), { notes: 0, bubbles: 0 });
});

test('activity counts every content type and nested Bubble, and follows deletions', () => {
  const items = [{ type: 'NOTE' }, { type: 'PHOTO' }, { type: 'CHECKLIST', rows: [{ done: true }] }];
  const bubbles = [{ id: 'parent', parentId: null }, { id: 'child', parentId: 'parent' }];
  assert.deepEqual(profileActivity(items, bubbles), { notes: 3, bubbles: 2 });
  assert.deepEqual(profileActivity(items.slice(1), bubbles.slice(0, 1)), { notes: 2, bubbles: 1 });
});

test('profile rejects blank names and excessive lengths, accepts optional bio and boundary lengths', () => {
  assert.equal(validateProfile('  ', ''), 'Please enter a display name.');
  assert.ok(validateProfile('a'.repeat(DISPLAY_NAME_LIMIT + 1), ''));
  assert.ok(validateProfile('Bubble', 'a'.repeat(BIO_LIMIT + 1)));
  assert.equal(validateProfile('a'.repeat(DISPLAY_NAME_LIMIT), 'a'.repeat(BIO_LIMIT)), null);
  assert.equal(validateProfile('  Hind  ', ''), null);
});

test('fallback avatar uses one Unicode initial and handles empty names', () => {
  assert.equal(profileInitials('  hind khial'), 'H');
  assert.equal(profileInitials('🌷 gardener'), '🌷');
  assert.equal(profileInitials(''), '•');
});
