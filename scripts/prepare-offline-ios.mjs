import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const plist = fileURLToPath(new URL('ios/Bubble/Info.plist', root));
if (process.platform !== 'darwin' || !existsSync(plist)) throw new Error('Existing local iOS project on macOS required. No project generated.');
const reason = JSON.parse(readFileSync(new URL('app.json', root))).expo.ios.infoPlist.NSFaceIDUsageDescription;
const current = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :NSFaceIDUsageDescription', plist], { encoding: 'utf8' });
if (current.status !== 0) {
  const result = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Add :NSFaceIDUsageDescription string ' + reason, plist], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Could not prepare Face ID description; stop before building.');
}
console.log('Face ID description present. No signing settings or installed app changed.');
console.log('Refresh native source references with your existing pinned CocoaPods: pod install --deployment. Do not prebuild --clean or uninstall.');
