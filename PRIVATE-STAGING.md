# Controlled local staging verification

Verified on 2026-10-16. This is a **local private environment**, not an external deployment or production release. Only synthetic accounts/content were used. No paid services, external infrastructure, DNS changes, system certificate trust changes or public listener were provisioned.

## Baseline and review

PR #5 was reviewed and merged into `integration` at `e359cb503e3923f361e6e3237dc9553b94a1e9cb`, after rerunning its 45 frontend tests, 62 PostgreSQL/backend tests, TypeScript, web export, packaging, security review and container checks. Image findings discovered during review were remediated before merge. Original `frontend` and `backend` branches were preserved. The `private-staging` branch starts from that merge; its PR requires separate approval and must not merge automatically.

## Running setup

The local Compose project is `bubble-private-staging`, serving `https://localhost:8443`. Nginx requires a separate bcrypt-protected tester credential before serving frontend/assets/API requests. Bubble's own account session, authorization and CSRF checks still apply after that gate. The frontend/backend architecture, screens, storage keys and database migrations remain unchanged.

Configuration, certificate keys, tester credentials, synthetic lifecycle state and backups are outside Git in an owner-only directory created by `prepare-private-staging.mjs`. The helper refuses to overwrite an existing setup or create secrets inside the repo. See [STAGING.md](STAGING.md) for generic paths and commands; actual local paths are supplied privately to the operator, not committed here.

The helper's local certificate expires after seven days and is not installed into system/browser trust automatically. Browser access requires explicit trust of the local CA according to the operator's policy. Never bypass certificate warnings or share the CA private key. CLI verification uses only an explicitly trusted local test CA and keeps TLS verification enabled.

## Verification evidence

| Area | Result and scope |
| --- | --- |
| Frontend tests | 47 tests pass, zero failures/skips; includes existing notes/lists/local storage/profile/appearance behavior and new credential/setup safety tests. |
| Backend | 62 tests pass, zero failures/errors/skips; real PostgreSQL/Testcontainers and Maven executable packaging. |
| Types/builds | TypeScript, whitespace checks, web export and all three Docker builds pass. No lint script exists. GitHub reports no CI checks. |
| Authorized access | Root, profile, asset and API requests without credentials return 401; wrong tester credentials are rejected. Correct tester credentials permit the TLS smoke and account client checks. Credentials are origin-scoped for future Playwright runs. |
| HTTPS/security | Trusted certificate handshake, Secure/HttpOnly/SameSite=Lax cookies, no-store responses, CSP headers, CSRF rejection and restricted CORS pass. No TLS verification bypass was used. |
| Accounts/content | Real client checks pass registration, failed/successful login, fresh-client session restoration, notes CRUD/pinning/case-insensitive search, checklist order/completion/add/remove, profile changes, appearance modes/accent, explicit synthetic copy/deduplication, deletion and logout. |
| Persistent fixture | Separate seeded note/checklist/profile/Dark-Sky blue settings survive complete service restart and compatible release switching. Old in-memory sessions are rejected after restart; signing back in restores the fixture content. |
| Database | Flyway V1/V2 migrate a new isolated volume and validate on subsequent starts. Application role is not a superuser and cannot create databases/roles. PostgreSQL main process UID 70; backend UID 10001; Nginx UID 101. |
| Backup/restore | Custom-format dump, archive listing and transactional restoration to a new `bubble_recovery` database pass. Seven application/Flyway tables compare exactly; source remains unchanged. The backend also starts against the recovered database and passes the persistent account fixture checks, then returns to the original database successfully. |
| Rollback | Distinct metadata-labelled candidate image IDs, retained compatible artifacts and restoration of the original release all pass account/TLS checks. Database container stays unchanged during app-only rollback; no migration is reversed. This uses the same app/schema, not an arbitrary historical version. |
| Image vulnerabilities | Digest-pinned Trivy 0.76.0 reports zero vulnerabilities at all severities in all three final runtime images with current databases. OCI archive/manifest/config identity is checked against the running containers; OS and Java package analysis must be present. A scan/identity failure cannot be reported as clean. |
| Network/permissions | Live checks confirm only 127.0.0.1:8443 published; PostgreSQL/backend have no host bindings and use an internal network. The host's non-loopback IPv4 address did not accept TCP 8443. App filesystems are read-only, capabilities dropped, secrets read-only, host secret parent owner-only. No external Internet reachability probe was performed. |

Raw logs, vulnerability reports, image identities, backup fingerprints and rehearsal results remain outside Git. The report scripts expose aggregate/package/container metadata only, never credential values. The scanner receives exported local images and a dedicated public vulnerability-DB cache, not the Docker socket or secret directory. Final image IDs and scan timestamps are recorded in the operator's scan `summary.json` and can be compared with `verify-private-staging.mjs` output. Vulnerability results are point-in-time evidence, not a guarantee against unknown issues.

## Security findings and changes

The preparation scan initially found outdated Go standard-library findings in the upstream PostgreSQL `gosu` binary, and fixable zlib/libpng findings. Those were removed/patched before PR #5 merged, with PostgreSQL's privilege drop and initialization retested. No scanner exceptions suppress them. The new tester gate closes the remaining gap between “reachable only on this host” and “authorized testers only”. Its header is stripped at the proxy; app authentication is unchanged. Nginx follows Docker DNS changes when backend containers are replaced, avoiding a stale upstream during recovery.

Source review and generated-secret comparison found no committed real credentials, private keys, cookies, personal notes or database dumps. Test strings in source are synthetic fixtures. Secret/credential filenames are excluded from Git and Docker contexts in addition to the helper's outside-repository requirement.

## Outstanding verification and release limits

- The eight Playwright browser scenarios are **not passed**. An actual run against gated staging stopped on the first Chromium launch failure (macOS Mach-port permission denied/SIGTRAP); seven scenarios did not run and no app assertion was reached. Config/types support the tester gate, but execution remains blocked.
- Local-only storage/profile/theme logic passes frontend tests; full staging browser local-only mode switching, offline behavior, responsive interaction and CSP rendering remain unverified. HTTP route refresh checks and Node storage tests are not browser UI proof. Complete browser verification before public release.
- Operator browser trust of the generated local CA is a separate manual step. Renew/replace the seven-day certificate and rotate tester/database secrets through a coordinated procedure before extending this test environment's lifetime. Do not regenerate passwords over an existing volume.
- App sessions are in-memory and do not survive backend restart. There is no zero-downtime, account offline synchronization, native persistence/session support or guaranteed cold offline shell.
- Rollback rehearsal proves same-schema artifact replacement and preservation only. A destructive/incompatible migration needs a reviewed forward fix or a new-database restore with explicit acceptance of lost post-backup writes.
- This setup is not authorized for remote/public access. A different host/domain requires approved private access, trusted TLS/HSTS, firewall and threat review, current image scans and a repeat recovery drill. Do not broaden the loopback port or remove the tester gate.

## Operator commands

After selecting the protected environment file and tester credential/CA paths as shown in [STAGING.md](STAGING.md):

```sh
sh deploy/staging/compose.sh ps
node scripts/verify-private-staging.mjs
node scripts/staging-smoke.mjs
pnpm test:account-live
node --experimental-strip-types scripts/staging-lifecycle.mjs session
node scripts/scan-private-staging.mjs /absolute/protected/reports/new-release
```

Stop safely with `sh deploy/staging/compose.sh stop`. Do not run `down -v`, change the project name or prune volumes to fix this persistent environment. Retain protected backups and rollback artifacts. Current data is synthetic; never copy a production database into this staging environment.
