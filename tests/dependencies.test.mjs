import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Exercise the actual React Native tooling dependency, without invoking a shell.
const require = createRequire(import.meta.url);
const reactNative = createRequire(require.resolve('react-native/package.json'));
const devtools = createRequire(reactNative.resolve('react-devtools-core/package.json'));
const { quote } = devtools('shell-quote');
test('tooling rejects newline injection after shell comment tokens', () => {
  for (const separator of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => quote(['echo', 'ok', {comment: 'fixture'}, `a${separator}id;#`]), TypeError);
  }
  assert.equal(quote(['echo', 'a b']), "echo 'a b'");
});
