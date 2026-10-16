import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {stagingAuthorization,stagingCredentials} from '../scripts/staging-auth.mjs';
import {preparePrivateStaging} from '../scripts/prepare-private-staging.mjs';

test('tester credentials stay restricted to HTTPS localhost and owner-only files',()=>{
  const folder=mkdtempSync(join(tmpdir(),'bubble-tester-'));
  try {
    const file=join(folder,'auth.json');const value={username:'tester',password:'synthetic-only-long-test-password'};
    writeFileSync(file,JSON.stringify(value),{mode:0o600});
    assert.equal(stagingAuthorization('https://localhost:8443',file),'Basic '+Buffer.from(value.username+':'+value.password).toString('base64'));
    assert.equal(stagingCredentials('https://localhost:8443',file).origin,'https://localhost:8443');
    assert.throws(()=>stagingAuthorization('http://localhost:8443',file));
    assert.throws(()=>stagingAuthorization('https://remote.example',file));
    chmodSync(file,0o644);assert.throws(()=>stagingAuthorization('https://localhost:8443',file));
    chmodSync(file,0o600);writeFileSync(file,'PRIVATE malformed credentials');
    assert.throws(()=>stagingAuthorization('https://localhost:8443',file),error=>!error.message.includes('PRIVATE'));
  } finally {rmSync(folder,{recursive:true,force:true});}
});
test('private setup cannot overwrite existing files or create secrets inside the repo',()=>{
  const folder=mkdtempSync(join(tmpdir(),'bubble-setup-'));
  try {
    const file=join(folder,'keep');writeFileSync(file,'Synthetic existing setup');
    assert.throws(()=>preparePrivateStaging(folder));assert.equal(readFileSync(file,'utf8'),'Synthetic existing setup');
    assert.throws(()=>preparePrivateStaging(resolve('.private-secrets')));
    assert.throws(()=>preparePrivateStaging(resolve('..private-secrets')));
  } finally {rmSync(folder,{recursive:true,force:true});}
});
