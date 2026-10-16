# Bubble testing and stability

## Application setup

See [INTEGRATION.md](INTEGRATION.md) for normal local startup, required database variables, API URL configuration, session/CSRF behavior and workspace boundaries. Java 21, Maven, Node.js 22.6+, pnpm and PostgreSQL are required. Docker is required for the default backend integration tests. Local browser mode needs no account or backend.

## Automated checks

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build:web
pnpm export:mobile
(cd backend && mvn clean verify)
```

Backend tests use Testcontainers with PostgreSQL 17 and the real Spring Security chain. They cover migrations/backfill, ownership isolation, validation, rollback, pagination/search, concurrent writes, cookies, CSRF, logout and rate limiting. No Java or frontend lint script is configured. `git diff --check` checks whitespace; it is not a linter.

## Isolated browser tests

Never point these tests at a personal or production database. They create unique fictional accounts, notes, checklists and settings, and use fresh browser contexts. Fixture accounts/content are retained for diagnosis; discard only the dedicated test database afterward. Tests do not use the normal browser profile. The test copy operation uses a generated local note, never existing personal content.

For example, start a separate disposable PostgreSQL container on loopback port 55435:

```sh
export POSTGRES_USER=bubble_test
export POSTGRES_DB=bubble_browser_tests
# Retain this credential for the lifetime of this disposable container.
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
docker run -d --name bubble-browser-tests \
  -p 127.0.0.1:55435:5432 \
  --env POSTGRES_USER --env POSTGRES_DB --env POSTGRES_PASSWORD \
  postgres:17-alpine
# Wait for readiness; repeat if initialization is still running.
docker exec bubble-browser-tests pg_isready -U bubble_test -d bubble_browser_tests
export DB_USERNAME="$POSTGRES_USER"
export DB_PASSWORD="$POSTGRES_PASSWORD"
export DB_URL=jdbc:postgresql://localhost:55435/bubble_browser_tests
export SERVER_PORT=8085
export SPRING_PROFILES_ACTIVE=local
export CORS_ALLOWED_ORIGINS=http://localhost:8091
(cd backend && mvn spring-boot:run)
```

In another terminal:

```sh
pnpm exec playwright install chromium
BUBBLE_E2E_DISPOSABLE=1 pnpm test:e2e
```

Playwright starts a separate Expo server at `http://localhost:8091` configured for `http://localhost:8085`. The backend must already be running. Optional overrides: `BUBBLE_E2E_URL` and `BUBBLE_E2E_API_URL`; use exact matching CORS origins. Only localhost hosts are allowed. Set `BUBBLE_E2E_REUSE_SERVER=1` only when intentionally reusing a frontend already configured for the disposable backend. Do not reuse a personal development origin. `BUBBLE_E2E_DISPOSABLE=1` is an explicit operator acknowledgement, not automatic database isolation.

The eight scenarios cover local offline editing/creation and storage restoration into a new browser context; registration/login/logout/session restoration/expired cookies; note editing/pinning/search/filtering/deletion; checklist item completion/add/remove; profile and theme persistence; explicit generated-fixture copying and failed-save draft retention; narrow-screen navigation/validation/empty states; and pending/failed search states. Checklist reordering has API coverage; there is currently no reorder control in the UI. A new browser context with saved storage simulates browser reopening, not an operating-system reboot.

Failed runs save screenshots/traces under ignored `test-results/`. Traces may contain generated test credentials and content: do not commit or publish them. No CI artifacts are uploaded automatically.

A separate real-client/API check is available:

```sh
BUBBLE_TEST_API_URL=http://localhost:8085 \
BUBBLE_TEST_ORIGIN=http://localhost:8091 pnpm test:account-live
```

This uses generated in-memory fixtures and no real browser data. It verifies the TypeScript client against Spring/PostgreSQL, including item ordering and local-copy deduplication. The origin must match backend CORS configuration. It removes only its own content; its fictional account remains.

## Current results and limitations

- Frontend: 43 unit tests pass; TypeScript and whitespace checks pass.
- Backend: final full run passes all 59 tests, zero failures/errors/skips, plus executable JAR packaging, against an isolated external PostgreSQL database. An earlier Testcontainers run failed with two container-readiness errors; the supported external-database configuration resolved that infrastructure blocker.
- Live TypeScript/Spring/PostgreSQL checks pass against both the updated server and the archived integration server, exercising the legacy checklist fallback with isolated fixtures.
- Expo web, iOS and Android exports pass.
- Browser walkthrough: local Bubble/note creation and refresh; registration/sign-in; account note creation/editing/direct-refresh restoration and case-insensitive body search; profile/bio and dark-mode/accent persistence; retained account draft during a stopped-backend save; mode switching with local-original preservation; and local editing/refresh with the backend stopped were verified on a separate test origin. These are walkthrough checks, not Playwright runner passes. Complete internet-offline browser reload/restart and the full UI checklist/transfer matrix remain unverified.
- The browser suite is discovered and type-checked, but its execution is blocked in the current environment: macOS denies Chromium's Mach-port bootstrap permission before a browser can start. The single attempted scenario fails at launch; it is not an application assertion failure. The complete eight-scenario suite still needs a run on an unrestricted development machine or CI runner. No automated browser pass is claimed.
- Local and account modes remain separate. Account mode requires a connection; no offline synchronization, conflict merge, or background upload exists.
- Native exports check bundling only. Native account sessions and native persistent storage are not implemented.
- The app has no installable offline shell. An already-loaded local screen can edit without internet; a cold offline load is not guaranteed.
- A 5xx write response is now treated as uncertain: the draft stays open and account writes are blocked until refresh, preventing blind duplicate retries. Reads do not trigger this write block. Regression tests cover both cases.
- Search now waits for a completed response before showing a no-results state, and distinguishes request failure or an unavailable session from an empty result. A browser regression scenario is included but awaits execution with the rest of the suite.

In restricted environments, set `TMPDIR` to a writable directory for Expo/Playwright and `JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=/absolute/writable/path` for Maven and forked Java tests. These are environment workarounds, not application changes. A temporary-directory fix does not resolve the separate Chromium launch restriction.

Performance regression checks and synthetic benchmark commands are documented in [PERFORMANCE.md](PERFORMANCE.md).

## Manual browser release checklist

Use an isolated browser profile/private window and the disposable PostgreSQL/backend setup above, at `http://localhost:8091` with API `http://localhost:8085`. Never clear or alter a personal browser profile or use real private content. Record the PR head SHA, browser/version, date, each result and any console errors. Use only fictional notes/accounts. A checked item requires observing its expected result; this checklist itself is not evidence that a step passed.

1. **Local start:** with the backend stopped, open Home without signing in. Confirm Home/Search/Add/You are reachable, empty states are helpful, and the app never requires an account. Cold offline loading is not guaranteed; load the app before disabling the network.
2. **Local content:** create a Bubble, note and checklist with three distinct rows. Edit the note; complete/uncomplete a checklist row; remove a different row; pin/unpin from card options. Refresh each detail URL, then close/reopen the browser with its storage retained. Verify exact text, completion, row order and pins. No reorder control currently exists: validate reordering through backend tests, not an invented UI action.
3. **Local profile/appearance:** set a fictional name/bio and emoji/color avatar. Change dark/light mode and accent. Refresh You and Home; verify the greeting, bio, avatar and theme persist. Record the local values for comparison after using account mode.
4. **Offline editing:** after loading the app and its needed routes, enable browser DevTools offline mode (or disconnect the network). Create/edit local content. Restore networking and refresh; confirm changes survive and no account API writes were attempted. A failed cold offline reload is a documented shell limitation, not proof of synchronization.
5. **Authentication:** start the test backend, register a fictional account, sign in and refresh. Verify account identity returns. Sign out; reject an incorrect password; sign in correctly. In the isolated profile only, remove its test session cookie and refresh: show a sign-in message without exposing stale account content. Local data must remain available.
6. **Account content:** create/edit a note and a checklist; toggle completion, add/remove items, pin/unpin, and refresh direct detail URLs. Verify exact text/order/completion. Search note body and checklist row text case-insensitively; check All/Notes/Lists, clear, no-match state, result opening and rapid query changes. Watch that stale cancelled results never replace the latest query and that no-results does not appear while a request is pending.
7. **Existing-data preservation:** before the reads above, record your synthetic note/list text, row IDs/order/completion, profile/bio, theme and accent. Reload/resume the account and repeat searches, pins and mode switches; compare all unrelated values exactly. Never use a real user's content for this check.
8. **Account profile/appearance:** update fictional display name/bio, then Light, Dark, System and an accent. Refresh after each; System should follow the device setting. Local avatar/photo/color/emoji controls remain local; account image upload is unsupported. Switching back to local mode must restore its original profile/theme, not the account's values.
9. **Explicit copy:** create a new synthetic local note/list, sign in and confirm neither appears in the account automatically. Review/select only those fixtures and copy explicitly. Confirm row content/completion, local originals unchanged, and a second attempt skips acknowledged copies. Never upload personal notes for a test.
10. **Failures:** while an account editor has a changed draft, stop only the disposable backend. Save: retain the draft, show an error and never claim success or retry a write automatically. Restore the backend, sign in again if its in-memory session was lost, and inspect account content before retrying an uncertain write. Switch to local mode; its originals/profile/theme must remain unchanged. A failed search must show a connection/session error rather than a genuine no-match state.
11. **Navigation/accessibility:** at desktop and approximately 375 px widths, use Tab/Shift+Tab and Enter/Space for navigation, form controls and modal actions. Confirm visible focus, readable light/dark text, no horizontal page overflow, usable scrolling, Cancel/discard behavior, and no duplicate save after rapid repeated activation. Test only synthetic content; delete only fixtures you created.

Backend automated tests additionally verify ownership isolation, CSRF, validation, migration preservation, atomic rollback and concurrent requests. Browser walkthroughs complement those checks; neither substitutes for the entire automated browser suite.

### Final review execution record

The final review reran 43 frontend tests, TypeScript, whitespace checks, the web export and the complete 59-test backend suite/JAR build. All passed. The PostgreSQL run used a separate `bubble_review_tests` database through the documented `BUBBLE_TEST_DB_*` configuration; no production database was used. iOS/Android exports above are from the original optimization validation, not a fresh native-device test.

Independent launch probes reproduced the browser blocker without loading Bubble: the Chromium headless shell reports macOS Mach-port bootstrap permission denied (1100) and SIGTRAP; the bundled full Chromium channel also exits before navigation (SIGABRT, with no equally specific cause reported). Writable temporary directories did not resolve it. No OS protections were disabled. Integration accepted this documented limitation; the eight scenarios are not marked passed. Full browser verification is still required before public release.

A separate in-app-browser walkthrough reconfirmed retained local note text after direct-detail refresh, case-insensitive local body search, account login/session restoration, existing account profile/bio and Dark/Sky blue preferences, case-insensitive account body search and result opening, and restoration of the separate local workspace. This is partial manual evidence, not completion of all eleven checklist items. Live API/client checks on both server versions additionally passed notes/checklists CRUD, completion/order, pins/search, profile/preferences, explicit synthetic copying/deduplication and local-original preservation. New backend assertions compare note, checklist, profile and appearance responses before/after eight concurrent detailed reads.

## Private staging verification

See [STAGING.md](STAGING.md) for configuration/build commands and the TLS/proxy smoke test. These checks do not replace browser testing. Use only the isolated loopback fixture stack, dedicated secrets/certificate files and synthetic data. Never use an existing personal development database or browser origin for staging tests.

Verification on 2026-10-16:

- Integration baseline `4ad0f3f`: 43 frontend tests, TypeScript, web export, 59 real PostgreSQL/Testcontainers tests and Maven JAR build passed after Docker was started.
- Preparation changes: 45 frontend tests, TypeScript and whitespace checks; 62 backend tests with zero failures/errors/skips and executable JAR packaging passed. New coverage rejects insecure deployment settings/URLs, preserves existing backup files, and checks staging cookies/CSRF/CORS/health through the real security chain.
- Both Docker images built from digest-pinned bases, including the staging frontend web export. Compose configuration validated; the isolated stack became healthy. Backend UID 10001 and Nginx UID 101 were verified. The database application role is not a superuser and cannot create roles/databases. PostgreSQL and Java publish no host ports; only 127.0.0.1:8443 is published.
- Real TLS/proxy smoke checks passed with an explicitly trusted disposable localhost test certificate: SPA detail-route refresh, missing assets returning 404, no-store/CSP headers, minimal health, Secure/HttpOnly/SameSite cookies, CSRF rejection and restricted CORS. Existing account client checks passed through the HTTPS proxy, including notes/checklists, profile/preferences, explicit copying and local preservation. Forged forwarding headers could not bypass the authentication address budget.
- The backup helper created a custom-format dump; archive listing and a transactional restore into a new recovery database passed. All seven application/Flyway tables matched exactly, with the source unchanged. Graceful application restart retained the same seven-table snapshot. Only disposable fixtures were used; temporary containers are removed after verification.
- Chromium launch was attempted again and failed before app navigation with the same macOS Mach-port permission denial/SIGTRAP. **None of the eight browser scenarios is marked passed.** CSP rendering, full browser persistence/navigation and the complete browser matrix remain release gates. Native-device behavior is not certified by these web/container checks.

No lint script exists. Image vulnerability scanning, real-domain certificate/access-control review, secret rotation and a repeat restore drill are required before any remotely hosted staging/public release. No real secrets, certificates/private keys, personal data, dumps or traces are committed; no external hosting, deployment workflow or automatic merge is configured.

### Deployment preparation security review

PR #5 was reviewed again on 2026-10-16: 45 frontend tests, 62 PostgreSQL/backend tests, TypeScript, web export and Maven packaging pass. No credentials/private keys were found in the reviewed source. Docker Scout requires a login in this environment; the alternate local scanner was Trivy 0.76.0, pinned to image digest `sha256:2416d1f74045b57274df1a340eee6b510cacd73c66a6ccb8da092b117eb7d222`, with telemetry disabled and no Docker socket or secrets mounted. Reports scanned exported final image files against its downloaded vulnerability databases.

The original PostgreSQL image reported 1 critical/24 high findings in the Go standard library bundled inside `gosu`, plus lower-severity findings. PostgreSQL itself does not use those Go networking parsers, but the helper was replaced with Alpine's `su-exec` instead of suppressing findings. Fixable zlib/libpng issues were patched in all affected runtimes. Rescanning the rebuilt backend, frontend and PostgreSQL images reported **zero vulnerabilities at every severity** with the current databases. This is a point-in-time scanner result, not a guarantee against unknown vulnerabilities.

All three image builds and isolated HTTPS/account-client smoke checks pass after remediation. PostgreSQL runs as UID 70 after initialization, the application role remains restricted, and migrations/health checks pass. The database image has a separate `DB_IMAGE_TAG` so app-only rollback cannot silently replace its runtime. The outstanding eight-scenario browser limitation remains unchanged. Raw reports contain only image/package metadata and remain outside Git.

### Controlled local staging run

See [PRIVATE-STAGING.md](PRIVATE-STAGING.md) for the 2026-10-16 execution record. The gated local stack passes 47 frontend tests, 62 backend tests, TypeScript/web/container builds, real HTTPS/account checks, protected tester access, session restoration/re-authentication after restart, seven-table backup/restore comparison, recovered-database API checks and a compatible-artifact rollback rehearsal. Secrets/permissions, running image identities and loopback-only bindings are checked by the new operator tools. Local-only module tests pass; full staging browser local mode remains unverified.

The existing eight browser scenarios now support an owner-only tester credential file, scoped to the exact HTTPS origin; API interception/counting is limited to `/api/v1/` so same-origin staging assets are not accidentally blocked. To retry on a suitable browser runner after its local CA trust is configured:

```sh
BUBBLE_E2E_URL=https://localhost:8443 BUBBLE_E2E_API_URL=https://localhost:8443 \
BUBBLE_E2E_DISPOSABLE=1 BUBBLE_E2E_REUSE_SERVER=1 \
BUBBLE_TEST_AUTH_FILE=/absolute/protected/bubble-staging/tester-credentials.json \
NODE_EXTRA_CA_CERTS=/absolute/protected/bubble-staging/ca.crt pnpm test:e2e
```

`NODE_EXTRA_CA_CERTS` configures Node, not browser trust. Do not set `ignoreHTTPSErrors` or bypass warnings. The current attempted run still fails at Chromium launch; one launch failure and seven not-run scenarios are **not** an eight-scenario pass. Traces may contain generated tester/account credentials and must remain ignored/private.
