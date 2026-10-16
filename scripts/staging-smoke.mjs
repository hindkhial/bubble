// HTTP/TLS checks only; this does not certify browser rendering or storage.
import assert from 'node:assert/strict';
import {validateStagingUrl} from './validate-staging-url.mjs';
const base=validateStagingUrl(process.env.BUBBLE_TEST_API_URL);
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use isolated localhost staging only.');
for(const path of ['/','/you','/search','/file/synthetic-fixture']) {
  const response=await fetch(base+path);
  assert.equal(response.status,200);
  assert.ok(response.headers.get('cache-control').includes('no-store'));
  assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.ok((await response.text()).includes('id="root"'));
}
assert.equal((await fetch(base+'/_expo/missing.js')).status,404);
const health=await fetch(base+'/api/v1/health');
assert.deepEqual(await health.json(),{status:'UP',application:'Bubble'});
const csrf=await fetch(base+'/api/v1/auth/csrf');
const cookie=csrf.headers.get('set-cookie');
for(const flag of ['Secure','HttpOnly','SameSite=Lax']) assert.ok(cookie.includes(flag));
assert.ok(csrf.headers.get('cache-control').includes('no-store'));
assert.equal((await fetch(base+'/api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
const denied=await fetch(base+'/api/v1/health',{headers:{Origin:'https://untrusted.example'}});
assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
console.log('PASS: trusted TLS, SPA routes, missing assets, no-store headers, CSP, minimal health, secure cookie flags, CSRF and restricted CORS. Browser scenarios remain separate.');
