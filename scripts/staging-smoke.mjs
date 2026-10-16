// HTTP/TLS checks only; this does not certify browser rendering or storage.
import assert from 'node:assert/strict';
import {validateStagingUrl} from './validate-staging-url.mjs';
import {stagingAuthorization} from './staging-auth.mjs';
const base=validateStagingUrl(process.env.BUBBLE_TEST_API_URL);
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use isolated localhost staging only.');
const authorization=stagingAuthorization(base);
assert.ok(authorization,'Supply owner-only tester credentials using BUBBLE_TEST_AUTH_FILE.');
for(const path of ['/','/you','/_expo/missing.js','/api/v1/health','/api/v1/auth/csrf']) {
  const denied=await fetch(base+path);
  assert.equal(denied.status,401);assert.ok(denied.headers.get('www-authenticate')?.includes('Basic'));
}
assert.equal((await fetch(base+'/',{headers:{Authorization:'Basic '+Buffer.from('invalid:invalid').toString('base64')}})).status,401);
const testedFetch=(url,options={})=>{
  const headers=new Headers(options.headers);headers.set('Authorization',authorization);
  return fetch(url,{...options,headers});
};
for(const path of ['/','/you','/search','/file/synthetic-fixture']) {
  const response=await testedFetch(base+path);
  assert.equal(response.status,200);
  assert.ok(response.headers.get('cache-control').includes('no-store'));
  assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.equal(response.headers.get('strict-transport-security'),null);
  assert.ok((await response.text()).includes('id="root"'));
}
assert.equal((await testedFetch(base+'/_expo/missing.js')).status,404);
const health=await testedFetch(base+'/api/v1/health');
assert.deepEqual(await health.json(),{status:'UP',application:'Bubble'});
const csrf=await testedFetch(base+'/api/v1/auth/csrf');
const cookie=csrf.headers.get('set-cookie');
for(const flag of ['Secure','HttpOnly','SameSite=Lax']) assert.ok(cookie.includes(flag));
assert.ok(csrf.headers.get('cache-control').includes('no-store'));
assert.equal(csrf.headers.get('strict-transport-security'),null);
assert.equal((await testedFetch(base+'/api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
const denied=await testedFetch(base+'/api/v1/health',{headers:{Origin:'https://untrusted.example'}});
assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
console.log('PASS: trusted TLS, SPA routes, missing assets, no-store headers, CSP, minimal health, secure cookie flags, CSRF and restricted CORS. Browser scenarios remain separate.');
