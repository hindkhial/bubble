// Only disposable GitHub-hosted Linux runners; never reads operator staging files.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { X509Certificate, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { verifyRecovery } from './recovery.mjs';
import { preparePrivateStaging } from '../prepare-private-staging.mjs';

assert.equal(process.platform, 'linux');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.ok(process.env.RUNNER_TEMP);
assert.notEqual(process.getuid(), 0, 'Chromium must run as a non-root user');
const folder = mkdtempSync(join(resolve(process.env.RUNNER_TEMP), 'bubble-ci-'));
const secrets = join(folder, 'secrets');
const home = join(folder, 'browser-home');
mkdirSync(home, {mode: 0o700});
const database = join(home, '.pki/nssdb');
const project = 'bubble-ci-' + randomBytes(8).toString('hex');
let started = false, trusted = false;
let environment;
const run = (command, args, env = environment, options = {}) => {
  const result = spawnSync(command, args, {env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options});
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed (details withheld to protect test credentials)`);
  return result.stdout;
};
const compose = args => run('sh', ['deploy/staging/compose.sh', ...args]);
const cert = args => run('certutil', args);
const origin = 'https://localhost:8443';
let auth;
async function checkTLS(expectedTrusted) {
  const browser = await chromium.launch({chromiumSandbox: true, env: {...environment, HOME: home}});
  try {
    const page = await browser.newPage({httpCredentials: auth});
    if (expectedTrusted) {
      const response = await page.goto(origin);
      assert.equal(response.status(), 200);
      await page.getByRole('button', {name: 'Search tab', exact: true}).waitFor();
    } else {
      await assert.rejects(() => page.goto(origin), /ERR_CERT_AUTHORITY_INVALID/);
    }
  } finally { await browser.close(); }
}
async function cleanup() {
  if (trusted) {
    cert(['-D', '-d', 'sql:' + database, '-n', 'Bubble CI temporary CA']);
    trusted = false;
    await checkTLS(false);
    console.log('PASS: temporary trust removed; fresh Chromium rejects certificate again');
  }
}
try {
  preparePrivateStaging(secrets);
  const caFile = join(secrets, 'ca.crt');
  const ca = new X509Certificate(readFileSync(caFile));
  const fingerprint = run('openssl', ['x509', '-in', caFile, '-noout', '-sha256', '-fingerprint'], process.env).trim().split('=').at(-1);
  assert.equal(ca.fingerprint256, fingerprint);
  assert.ok(ca.ca && ca.verify(ca.publicKey));
  assert.ok(Date.now() >= Date.parse(ca.validFrom) && Date.now() < Date.parse(ca.validTo));
  console.log('Ephemeral CI CA SHA-256: ' + fingerprint);
  auth = JSON.parse(readFileSync(join(secrets, 'tester-credentials.json'), 'utf8'));
  const authFile = join(folder, 'auth.json');
  writeFileSync(authFile, JSON.stringify({...auth, origin}), {mode: 0o600, flag: 'wx'});
  environment = {...process.env, STAGING_PROJECT: project, STAGING_ENV_FILE: join(secrets, 'staging.env'),
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache/ms-playwright'),
    BUBBLE_TEST_API_URL: origin, BUBBLE_E2E_URL: origin, BUBBLE_E2E_API_URL: origin, BUBBLE_E2E_REUSE_SERVER: '1', BUBBLE_E2E_DISPOSABLE: '1',
    BUBBLE_TEST_AUTH_FILE: authFile, NODE_EXTRA_CA_CERTS: caFile, BUBBLE_CI_OUTPUT: join(folder, 'results')};
  started = true; // also clean up a partially failed build/start
  compose(['up', '--build', '--detach', '--wait', '--wait-timeout', '240']);
  run('node', ['scripts/verify-private-staging.mjs']);
  run('node', ['scripts/staging-smoke.mjs', origin]);
  await checkTLS(false);
  mkdirSync(database, {recursive: true, mode: 0o700});
  cert(['-N', '-d', 'sql:' + database, '--empty-password']);
  // Import only the freshly generated, fully fingerprint-verified CI root.
  cert(['-A', '-d', 'sql:' + database, '-n', 'Bubble CI temporary CA', '-t', 'C,,', '-i', caFile]);
  trusted = true;
  await checkTLS(true);
  console.log('PASS: sandboxed Chromium rejects untrusted TLS and accepts isolated temporary trust');
  const result = spawnSync('node', ['node_modules/@playwright/test/cli.js', 'test', '--config=scripts/ci/browser.config.cjs', '--reporter=json'],
    {env: {...environment, HOME: home}, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  // Raw reports may contain generated passwords. Print only titles/status/counts.
  const report = JSON.parse(result.stdout);
  const visit = suites => { for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      console.log(`${spec.ok ? 'Passed' : 'Failed'}: ${spec.title}`);
      for (const test of spec.tests ?? []) for (const result of test.results ?? []) for (const error of result.errors ?? []) {
        const classification = error.message?.match(/Executable doesn't exist|ERR_CERT_AUTHORITY_INVALID|No usable sandbox|Target page, context or browser has been closed|Timeout [0-9]+ms exceeded/);
        if (classification) console.log('Failure category: ' + classification[0]);
        // Source coordinates are useful for diagnosis without printing credentials/assertion values.
        const source = error.stack?.match(/workspaces\.spec\.ts:(\d+):(\d+)/);
        if (source) console.log(`Failure source: workspaces.spec.ts:${source[1]}:${source[2]}`);
      }
    }
    visit(suite.suites);
  }};
  visit(report.suites);
  console.log(JSON.stringify(report.stats));
  assert.equal(result.status, 0, 'Browser scenarios failed');
  assert.equal(report.stats.expected, 9);
  assert.equal(report.stats.unexpected, 0);
  assert.equal(report.stats.skipped, 0);
  assert.equal(report.stats.flaky, 0);
  verifyRecovery({folder, environment, run, compose});
  const scan = JSON.parse(run('node', ['scripts/scan-private-staging.mjs', join(folder, 'image-scan')]));
  console.log('PASS: final candidate runtime image scan ' + JSON.stringify(scan.images.map(({service, scannedConfig, counts}) => ({service, scannedConfig, counts}))));
} catch (error) {
  // Do not print application responses, generated credentials, or raw reports.
  console.error('Browser CI failed: ' + error.message);
  process.exitCode = 1;
} finally {
  try { await cleanup(); } catch { console.error('Temporary trust cleanup verification failed'); process.exitCode = 1; }
  try { if (started) compose(['down', '--volumes', '--remove-orphans']); }
  catch { console.error('Disposable CI stack cleanup failed'); process.exitCode = 1; }
  rmSync(folder, {recursive: true, force: true});
}
