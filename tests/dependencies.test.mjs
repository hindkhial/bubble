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

const router = createRequire(require.resolve('expo-router/package.json'));
const queryString = router('query-string');
test('patched upstream decoder preserves the router CommonJS query contract', () => {
  const actual = queryString.parse('name=%F0%9F%90%B1&space=hello+world&tag=a&tag=b&empty=&flag');
  assert.deepEqual({...actual}, {empty: '', flag: null, name: '🐱', space: 'hello world', tag: ['a', 'b']});
  assert.deepEqual({...queryString.parse(queryString.stringify(actual))}, {...actual});
  assert.equal(queryString.parse('bad=%FE%FF').bad, '\uFFFD\uFFFD');
});

test('malformed percent-encoded URL input finishes in an isolated bounded process', async () => {
  const { spawnSync } = await import('node:child_process');
  const input = '%E0%A4%A'.repeat(256);
  const source = `const {createRequire}=require('node:module');const fs=require('node:fs');const r=createRequire(require.resolve('expo-router/package.json'));const q=r('query-string');const value=q.parse('input='+fs.readFileSync(0,'utf8')).input;if(typeof value!=='string')process.exit(1);`;
  const result = spawnSync(process.execPath, ['-e', source], {input, encoding: 'utf8', timeout: 5000, maxBuffer: 65536});
  assert.equal(result.error, undefined, 'Decoder timed out or failed to start');
  assert.equal(result.status, 0, 'Decoder failed on malformed synthetic URL data');
});
