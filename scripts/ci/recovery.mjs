import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Called only inside the freshly created CI project, never operator staging.
export function verifyRecovery({folder, environment, run, compose}) {
  assert.match(environment.STAGING_PROJECT, /^bubble-ci-[a-f0-9]{16}$/);
  const state = join(folder, 'fixture.json');
  const env = {...environment, BUBBLE_TEST_STATE_FILE: state};
  const fixture = phase => run('node', ['--experimental-strip-types', 'scripts/staging-lifecycle.mjs', phase], env);
  const sql = (database, query) => compose(['exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', '-c', query]).trim();
  fixture('seed');
  fixture('session');
  const history = sql('bubble_staging', 'SELECT version || chr(58) || success FROM flyway_schema_history ORDER BY installed_rank;');
  assert.equal(history, '1:true\n2:true');
  const dump = join(folder, 'recovery.dump');
  run('sh', ['deploy/staging/backup.sh', dump]);
  const archive = readFileSync(dump);
  run('sh', ['deploy/staging/compose.sh', 'exec', '-T', 'db', 'pg_restore', '--list'], environment, {input: archive});
  compose(['exec', '-T', 'db', 'createdb', '-U', 'postgres', '--owner=bubble_app', 'bubble_ci_recovery']);
  run('sh', ['deploy/staging/compose.sh', 'exec', '-T', 'db', 'pg_restore', '-U', 'postgres', '--role=bubble_app', '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', '--dbname=bubble_ci_recovery'], environment, {input: archive});
  for (const table of ['users', 'profiles', 'notes', 'checklists', 'checklist_items', 'user_preferences', 'flyway_schema_history']) {
    const query = `SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text, '[]')) FROM ${table} t;`;
    assert.equal(sql('bubble_ci_recovery', query), sql('bubble_staging', query), 'Restored table differs: ' + table);
  }
  // Restart all services without deleting the volume and reauthenticate.
  compose(['stop']);
  compose(['up', '--detach', '--no-build', '--wait', '--wait-timeout', '240']);
  fixture('restart');
  const override = join(folder, 'recovery.compose.yml');
  writeFileSync(override, 'services:\n  backend:\n    environment:\n      DB_URL: jdbc:postgresql://db:5432/bubble_ci_recovery\n', {mode: 0o600, flag: 'wx'});
  // Validate application compatibility with the restored database, then return
  // to the unchanged source. This does not certify arbitrary historical images.
  compose(['-f', override, 'up', '--detach', '--no-build', '--wait', '--wait-timeout', '240']);
  fixture('restart');
  compose(['up', '--detach', '--no-build', '--wait', '--wait-timeout', '240']);
  fixture('restart');
  run('node', ['scripts/verify-private-staging.mjs']);
  console.log('PASS: migrations, seven-table backup/restore, recovered-backend operation and restart persistence');
}
