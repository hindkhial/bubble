import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
// com.hindkhial.bubble is owner-approved for local development only.
// Generation does not register an App ID or create provisioning profiles.
const before = JSON.parse(readFileSync('package.json', 'utf8'));
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'prebuild', '--platform', 'ios', '--no-install'], { stdio: 'inherit', env: process.env });
// Expo prebuild also rewrites Android's script; Android work is deferred.
const after = JSON.parse(readFileSync('package.json', 'utf8'));
if (after.scripts.android !== before.scripts.android) {
  after.scripts.android = before.scripts.android;
  writeFileSync('package.json', JSON.stringify(after, null, 2) + '\n');
}
process.exitCode = result.status ?? 1;
