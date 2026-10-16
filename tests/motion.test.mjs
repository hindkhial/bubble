import test from 'node:test';
import assert from 'node:assert/strict';
import { observeReducedMotion } from '../src/theme/motion.ts';

function fixture() {
  let resolve, reject, listener;
  let removed = 0;
  const initial = new Promise((yes, no) => { resolve = yes; reject = no; });
  const values = [];
  const stop = observeReducedMotion({
    isReduceMotionEnabled: () => initial,
    addEventListener: (event, callback) => {
      assert.equal(event, 'reduceMotionChanged'); listener = callback;
      return { remove() { removed++; } };
    },
  }, enabled => values.push(enabled));
  return { values, resolve, reject, change: value => listener(value), stop, removed: () => removed };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('reduced motion follows initial preference and live device changes', async () => {
  const f = fixture(); f.resolve(false); await flush();
  assert.deepEqual(f.values, [false]);
  f.change(true); assert.deepEqual(f.values, [false, true]);
  f.stop(); assert.equal(f.removed(), 1);
});
test('a stale initial preference cannot undo a newer live change', async () => {
  const f = fixture(); f.change(true); f.resolve(false); await flush();
  assert.deepEqual(f.values, [true]); f.stop();
});
test('late preference results and events do not update an unmounted observer', async () => {
  const f = fixture(); f.stop(); f.resolve(false); f.change(false); await flush();
  assert.deepEqual(f.values, []); assert.equal(f.removed(), 1);
});
test('a failed preference query retains the conservative default and live subscription', async () => {
  const f = fixture(); f.reject(new Error('Unavailable')); await flush();
  assert.deepEqual(f.values, []); f.change(true); assert.deepEqual(f.values, [true]); f.stop();
});
