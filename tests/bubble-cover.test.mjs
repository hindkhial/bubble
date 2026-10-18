import test from 'node:test';
import assert from 'node:assert/strict';
import { bubbleCreationError, coverHeight } from '../src/utils/bubbleCover.ts';

test('new Bubbles require a title and cover photo', () => {
  assert.ok(bubbleCreationError('', 'file:///photo.jpg'));
  assert.match(bubbleCreationError('Travel'), /cover photo/);
  assert.match(bubbleCreationError('Travel', '  '), /cover photo/);
  assert.equal(bubbleCreationError('Travel', 'file:///photo.jpg'), null);
});

test('equal-width covers preserve landscape and tall portrait proportions', () => {
  assert.equal(coverHeight(170, 0.5), 85);
  assert.equal(coverHeight(170, 2), 340);
  assert.equal(coverHeight(170, 3), 510);
  for (const ratio of [undefined, NaN, Infinity, 0, -1]) assert.equal(coverHeight(170, ratio), 170);
});
