import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Exercise the real helper against isolated fake tools. This is a build-command
// regression test, not native compilation, signing, Keychain or Simulator proof.
function run(scenario = 'ok') {
  const folder = mkdtempSync(join(tmpdir(), 'bubble-simulator-helper-'));
  try {
    mkdirSync(join(folder, 'scripts'));
    mkdirSync(join(folder, 'ios/Bubble.xcworkspace'), { recursive: true });
    writeFileSync(join(folder, 'ios/Bubble.xcworkspace/contents.xcworkspacedata'), 'fixture');
    writeFileSync(join(folder, 'scripts/build.sh'), readFileSync(new URL('../scripts/build-ios-simulator-release.sh', import.meta.url)));
    const tool = `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const command = path.basename(process.argv[1]), args = process.argv.slice(2);
fs.appendFileSync(process.env.RECORD, JSON.stringify({command, args})+'\\n');
if(command === 'xcodebuild') {
  if(process.env.SCENARIO !== 'missing-bundle') {
    const app = path.join(args[args.indexOf('-derivedDataPath')+1], 'Build/Products/Release-iphonesimulator/Bubble.app');
    fs.mkdirSync(app, {recursive:true});fs.writeFileSync(path.join(app,'main.jsbundle'),'synthetic bundle');
  }
} else if(args.includes('-dv')) {
  if(process.env.SCENARIO === 'unsigned') process.exit(1);
  console.error('Signature='+ (process.env.SCENARIO === 'certificate' ? 'certificate' : 'adhoc'));
  console.error('TeamIdentifier='+ (process.env.SCENARIO === 'team' ? 'unexpected-team' : 'not set'));
} else if(process.env.SCENARIO === 'verify-failed') process.exit(1);
`;
    for (const name of ['xcodebuild', 'codesign']) { const path = join(folder, name); writeFileSync(path, tool); chmodSync(path, 0o700); }
    const record = join(folder, 'commands.jsonl');
    const result = spawnSync('sh', [join(folder, 'scripts/build.sh')], { encoding: 'utf8', env: {
      ...process.env, PATH: folder + ':' + process.env.PATH, BUBBLE_SIMULATOR_BUILD_DIR: join(folder, 'build'), RECORD: record, SCENARIO: scenario,
    } });
    return { ...result, commands: readFileSync(record, 'utf8').trim().split('\n').map(line => JSON.parse(line)) };
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

test('actual Release helper uses only Simulator ad hoc signing and verifies the resulting artifact', () => {
  const result = run(); assert.equal(result.status, 0, result.stderr);
  const build = result.commands[0]; assert.equal(build.command, 'xcodebuild');
  for (const [flag, value] of [['-sdk', 'iphonesimulator'], ['-configuration', 'Release'], ['-destination', 'generic/platform=iOS Simulator']])
    assert.equal(build.args[build.args.indexOf(flag)+1], value);
  for (const setting of ['CODE_SIGNING_ALLOWED=YES', 'CODE_SIGNING_REQUIRED=YES', 'CODE_SIGN_IDENTITY=-', 'DEVELOPMENT_TEAM=', 'PROVISIONING_PROFILE=', 'PROVISIONING_PROFILE_SPECIFIER='])
    assert.ok(build.args.includes(setting), setting);
  assert.ok(!build.args.some(value => value.includes('allowProvisioning')));
  assert.deepEqual(result.commands.map(command => command.command), ['xcodebuild', 'codesign', 'codesign']);
  assert.deepEqual(result.commands[2].args.slice(0, 3), ['--verify', '--deep', '--strict']);
  assert.match(result.stdout, /local ad hoc signature verified/);
});

test('Release helper stops on absent bundle, unsigned artifact, nonlocal signing or invalid signature', () => {
  for (const scenario of ['missing-bundle', 'unsigned', 'certificate', 'team', 'verify-failed']) {
    const result = run(scenario);
    assert.notEqual(result.status, 0, scenario);
    assert.doesNotMatch(result.stdout, /local ad hoc signature verified/, scenario);
    assert.ok(result.commands.every(command => ['xcodebuild', 'codesign'].includes(command.command)));
  }
});
