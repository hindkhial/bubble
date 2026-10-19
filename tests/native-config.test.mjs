import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nativeApiBase } from '../src/api/native.ts';
test('native API has no HTTP fallback, refuses insecure/credential URLs and accepts explicit HTTPS',()=>{
 assert.equal(nativeApiBase(), '');assert.equal(nativeApiBase('https://private.example.test/'),'https://private.example.test');
 for(const url of ['http://localhost:8080','https://user:secret@example.test','https://example.test?token=secret','https://example.test/backend','file:///private'])assert.throws(()=>nativeApiBase(url));
});
test('local development identity and Expo native configuration preserve TLS and photo scope',()=>{
 const c=JSON.parse(readFileSync(new URL('../app.json',import.meta.url))).expo;
 assert.equal(c.ios.bundleIdentifier,'com.hindkhial.bubble');assert.equal(c.ios.supportsTablet,false);assert.equal(c.userInterfaceStyle,'automatic');
 assert.equal(c.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-build-properties')[1].ios.deploymentTarget,'16.4');
 const photo=c.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker')[1];assert.equal(photo.cameraPermission,false);assert.equal(photo.microphonePermission,false);
 assert.equal(c.ios.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads,undefined);
 const eas=JSON.parse(readFileSync(new URL('../eas.json',import.meta.url)));assert.equal(eas.build['development-simulator'].ios.simulator,true);assert.equal(eas.submit,undefined);
});
