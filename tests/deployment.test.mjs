import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStagingUrl} from '../scripts/validate-staging-url.mjs';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('staging build rejects insecure or credential-bearing API origins',()=>{
  assert.equal(validateStagingUrl('https://localhost:8443'),'https://localhost:8443');
  for(const url of ['', 'http://localhost:8443', 'https://user:secret@example.test', 'https://example.test/api',
    'https://example.test/', 'https://example.test?token=private', 'https://example.test#fragment', 'https://*.example.test', 'https://example.test\n'])
    assert.throws(()=>validateStagingUrl(url));
});

test('backup refuses an existing path and preserves its exact contents',()=>{
  const folder=mkdtempSync(join(tmpdir(),'bubble-backup-test-'));
  try {
    const file=join(folder,'existing.dump');writeFileSync(file,'Existing synthetic backup');
    const result=spawnSync('sh',['deploy/staging/backup.sh',file],{encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.equal(readFileSync(file,'utf8'),'Existing synthetic backup');
  } finally {rmSync(folder,{recursive:true,force:true});}
});
