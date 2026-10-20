import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Execute the real helper with fake native tools; not device/signing evidence.
function run(origin = 'https://192.0.2.10:8444', scenario = 'ok') {
  const folder = mkdtempSync(join(tmpdir(), 'bubble-personal-build-'));
  try {
    mkdirSync(join(folder, 'scripts'));
    mkdirSync(join(folder, 'ios/Bubble.xcworkspace'), { recursive: true });
    writeFileSync(join(folder, 'ios/Bubble.xcworkspace/contents.xcworkspacedata'), 'fixture');
    writeFileSync(join(folder, 'scripts/build.sh'), readFileSync(new URL('../scripts/build-ios-personal-release.sh', import.meta.url)));
    const tool = `#!${process.execPath}
const fs=require('node:fs'),p=require('node:path'),args=process.argv.slice(2),command=p.basename(process.argv[1]);
fs.appendFileSync(process.env.RECORD,JSON.stringify({command,args,CI:process.env.CI,skip:process.env.SKIP_BUNDLING,origin:process.env.EXPO_PUBLIC_API_URL})+'\\n');
if(command==='xcodebuild' && process.env.SCENARIO!=='missing'){
  const app=p.join(args[args.indexOf('-derivedDataPath')+1],'Build/Products/Release-iphoneos/Bubble.app');
  fs.mkdirSync(app,{recursive:true});fs.writeFileSync(p.join(app,'main.jsbundle'),process.env.SCENARIO==='stale'?'stale bundle':process.env.EXPO_PUBLIC_API_URL);
}
if(command==='codesign' && process.env.SCENARIO==='unsigned')process.exit(1);
`;
    for (const name of ['xcodebuild', 'codesign']) { writeFileSync(join(folder, name), tool); chmodSync(join(folder, name), 0o700); }
    const record = join(folder, 'commands.jsonl');
    const result = spawnSync('sh', [join(folder, 'scripts/build.sh')], { encoding: 'utf8', env: {
      ...process.env, PATH: folder + ':' + process.env.PATH, EXPO_PUBLIC_API_URL: origin,
      CI: '1', SKIP_BUNDLING: '1', BUBBLE_PERSONAL_BUILD_DIR: join(folder, 'output'), RECORD: record, SCENARIO: scenario,
    } });
    return { ...result, commands: existsSync(record) ? readFileSync(record, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [] };
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

test('personal Release helper bundles fresh HTTPS configuration without changing signing or installing', () => {
  const r = run(); assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.commands.map(x => x.command), ['xcodebuild', 'codesign']);
  const build = r.commands[0];
  assert.equal(build.CI, undefined); assert.equal(build.skip, undefined);
  assert.ok(build.args.includes('EXPO_PUBLIC_API_URL=https://192.0.2.10:8444'));
  assert.equal(build.args[build.args.indexOf('-sdk') + 1], 'iphoneos');
  assert.equal(build.args[build.args.indexOf('-configuration') + 1], 'Release');
  assert.ok(!build.args.some(x => /SIGN|TEAM|PROVISION|allowProvisioning/.test(x)));
  assert.match(r.stdout, /Nothing installed/);
});

test('personal helper refuses unsafe origins before native build', () => {
  for (const origin of ['', 'http://example.test', 'https://u:p@example.test', 'https://example.test/path', 'https://example.test/?secret=x', 'https://example.test/#x']) {
    const r = run(origin); assert.notEqual(r.status, 0, origin); assert.deepEqual(r.commands, []);
  }
});

test('personal helper rejects absent/stale bundles and invalid signatures', () => {
  for (const scenario of ['missing', 'stale', 'unsigned']) {
    const r = run(undefined, scenario); assert.notEqual(r.status, 0, scenario);
    assert.doesNotMatch(r.stdout, /Signature and embedded HTTPS origin verified/);
  }
});
