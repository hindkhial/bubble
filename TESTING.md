## Offline account protection candidate — October 20, 2026

Branch `offline-account-protection` starts at reviewed PR #13 head 77b14cf.
OFFLINE-ACCOUNT-PROTECTION.md records scope, security policy, limits and native
manual checklist. This follow-up does not install an app or mutate live data.

- Local frontend: 116 tests Passed, zero failed/skipped; TypeScript Passed.
  New tests execute offline transport locks with request spies, schema/search
  behavior, serialized immutable drafts, failed-write recovery and publication
  state parsing. Offline requests (GET/POST/PATCH/DELETE) never reached the bridge
  or global fetch in that execution. This is not packet capture on an iPhone.
- Native: 25 actual CryptoKit/policy checks Passed using synthetic data: encryption
  roundtrip, new nonce, wrong key/backend/account/record, tampering/truncation,
  expiry, clock changes, reboot, revoked/future-version grant and network/owner
  guards. No Mac Keychain was accessed by that executable.
- Full SessionTransport + vault/cipher/policy Swift typecheck Passed against the
  actual iOS Simulator SDK and installed Expo frameworks; Swift syntax Passed.
  Standalone probe initially lacked ExpoModulesJSI; adding its existing framework
  search path resolved it without changing dependencies or toolchains.
- Existing workspace CocoaPods `--deployment` source refresh Passed; app project
  and Podfile.lock hashes unchanged. Only the required Face ID usage description
  was added to the ignored local Info.plist, matching tracked app.json. No signing
  settings, installed app, provisioning, trust or firewall changes.
- iOS Hermes/assets export Passed; not native compilation. Full agent Simulator
  build still exits 66 before compilation because of existing session restrictions.
- Owner-run Xcode Simulator Product → Build: Passed (reported October 20).
  Build only; new-feature runtime remains untested.
- New-feature Simulator and physical-device Face ID/Keychain/cache/draft runtime,
  unavailable-key runtime, real logout/reboot/expiry and interrupted-publication
  scenarios remain Not Tested. Previous physical reports are baseline evidence
  only, not passes for this new feature. Destructive recovery not performed.
- Backend/schema unchanged. New PR CI must provide its own frontend/backend,
  browser, recovery and runtime-scan evidence. Existing dependency advisories
  remain open; no finding was suppressed or assumed fixed by this change.

## Personal iPhone verification — October 20, 2026

Active scope: PERSONAL-IPHONE.md. Public distribution is deferred. Fetched
integration remains ed80addc932535caf3d841d108af7d5bf0111402; PR #13 is unmerged.

- Passed locally: 106 frontend tests, zero failed/skipped; TypeScript; personal
  helper shell syntax. Three new tests execute the real helper with isolated
  fake native tools, checking fresh public settings, no signing overrides/install,
  invalid-origin rejection, missing/stale bundles and invalid signatures. They
  are not native installation tests. An initial temp-directory permission failure
  was resolved with a workspace TMPDIR; the complete final run passed.
- Passed locally: iOS Hermes/assets export with the private HTTPS origin. This
  is not compilation. The existing owner-built physical artifact contains that
  origin and embedded JavaScript and passes strict/deep signature verification.
- Fresh native build: blocked before compilation, xcodebuild exit 66 with session
  CoreSimulator/workspace/output permission failures. No agent build pass claimed.
  Owner previously supplied actual successful physical Release build output,
  installation and launch reports. Embedded profile metadata: one-device local
  provision, October 20 to October 27, 2026, 01:02:16 UTC. No new provisioning.
- Owner confirmed iPhone 13 / iOS 26.1 and Xcode Personal Team. Artifact minimum
  iOS is 16.4; no deployment target or signing setting was changed.
- Owner-reported physical iPhone 13 passes: login to Home; requested note/edit,
  checklist/search, bio/accent workflow; close/reopen, gateway credentials plus
  session restore; logout/relogin and retained content. Physical photo replacement,
  signup/password changes, isolation and actual session expiry remain Not Tested
  separately. Account persistence is server evidence, not legacy SQLite evidence.
- Earlier owner-reported Simulator passes: signed standalone Release launch with
  no listener on tested Metro ports; login/session restoration and saved content;
  SQLite notes/checklists/completion, profile/photo and Appearance retention.
  Historical no-internet local-mode tests predate mandatory login and do not
  establish offline account access.
- Source confirms online verification at startup/background return and a
  15-minute foreground window. Unavailable-Mac cold start, real expiry, controlled
  same-identity update preservation, full device backup/recovery and physical
  accessibility remain Not Tested. The independent second-LAN-device blocking
  check is explicitly owner-deferred, not Passed. Dependency findings remain open.
- Backend/schema unchanged; backend, browser and image scans not rerun locally
  for this helper/documentation change. Previous hosted run 39356645990 at
  54123e5 passed 103 frontend tests, 71 PostgreSQL/backend tests and 11 browser
  scenarios. Those historical results do not certify the new follow-up head.

No app installation/uninstall, data migration/restore, signing/security changes,
firewall action, merge or deployment occurred in this follow-up. See
PERSONAL-IPHONE.md for backup limitations and the current operational blockers.

## Full-diff review follow-up

At b97a0b5, all three hosted CI jobs Passed (run 39175806182): 94 frontend tests, 71 PostgreSQL backend tests, eleven sandboxed HTTPS browser scenarios and recovery/image gates. Full review reproduced an inherited synchronous local-checklist storage-error escape. The actual event-handler regression failed before the catch fix and Passed afterward; the frontend suite now has 95 passing tests and TypeScript passes. No backend/schema/dependency changes were made by the review fix. RELEASE-OPERATIONS.md now names V1–V3 and all nine tables already covered by recovery.mjs. See AUTH-PROFILE.md for the 124-versus-28 file reconciliation, branch dependencies, review limitations and merge-order recommendation. Correction-head CI evidence is recorded on PR #12; earlier results are not transferred to an untested head.

# Authentication and profile UI follow-up — 2026-10-18

See [AUTH-PROFILE.md](AUTH-PROFILE.md) for scope, password-session security, exact baseline and executable Simulator checks. Local validation: 94 frontend unit/render tests, TypeScript, 71 PostgreSQL-backed backend tests and packaging, iOS Hermes export and production web build Passed. Owner-operated Bubble Auth Test Simulator checks Passed: two-bubble logo, no authentication Appearance, standalone You Log Out, Security Change Password/no Log Out, mismatched and incorrect-current password validation, successful password change to Welcome, new-password login and retained saved test content. CLI CoreSimulator control/fresh native compilation remain blocked; physical-device and broader accessibility/keyboard checks remain Not Tested. An export is not a native build. Hosted frontend/backend passed at 91414dd. Local/hosted browser runs passed 9/11: the new success-message locator matched a hidden stacked screen and logout navigation ran before server confirmation. Tests now select the visible success message and await confirmed logout. Hosted rerun 99eb309 passed 10/11; its remaining hidden password-field match is now scoped to the visible screen, with final CI results recorded in the PR. A stalled local rerun was terminated; its isolated CA trust was removed and disposable container deleted, without claiming a pass. The clean final local rerun at 517b922 Passed all eleven scenarios with zero skipped/flaky, sandbox and TLS enabled, and temporary trust removal verified; its container was removed. Final review also placed the password-session rejection filter after standard CORS/security-header processing, with HTTP regression assertions for rejected stale sessions. Final hosted results are recorded in the PR. The runtime scan found one High and four Medium libx11/libxpm findings in the web-tester image; compatible patched Alpine versions are required in its Dockerfile, and the final scan now reports zero findings for all three running images, with identity binding verified. Results will be recorded in the PR. Existing dependency findings and manual release gates remain open. No user data or schema migration is changed.

The previous head 0086062 executed all ten browser scenarios successfully on GitHub; its job failed afterward on the stale expected-count assertion (10 versus 9). This branch updates the count for the eleven scenarios, including the new password-change regression, and retains zero-skipped/zero-flaky/zero-unexpected requirements.

# Bubble testing and stability

## Native accounts and account library — 2026-10-18

This candidate is **not release-approved**. See [IOS-ACCOUNTS.md](IOS-ACCOUNTS.md)
for the authentication design, account photo limits, legacy data recovery and the
separate owner-executed Simulator results. Historic all-green runs below do not
supersede the current outstanding browser checks.

Local results:

- Passed: 87 frontend tests and TypeScript checks, including a regression check
  for whitespace text children that React Native rejects in its Add sheet.
- Passed: all 67 Java 21/PostgreSQL tests, Maven packaging, Flyway V1–V3, private
  image ownership checks, image validation, atomic destinations and preservation
  of contents when deleting an account Bubble.
- Passed: iOS Hermes export and frontend/backend production container builds.
  JavaScript exports do not stand in for native compilation or a physical test.
  The existing native session module was built successfully in Xcode and the
  owner confirmed native registration/login/logout/restoration; no new native
  dependency or Swift changes were required for the account library extension.
- Passed: protected pre-update database backup, restoration into a new temporary
  database, and exact row comparisons confirming all pre-existing user/profile/
  note/checklist/item/preference records were unchanged after V3. The temporary
  comparison database was removed; the original volume and backup remain.
- Passed: current running frontend, backend and PostgreSQL images scanned with
  the pinned Trivy scanner, with no reported vulnerabilities. Running image and
  tag identities were rechecked against the scan summary. This is an image result,
  not closure of the previously documented development dependency advisories.
- Final clean local browser rerun: **10 Passed, 0 Failed, 0 Skipped, 0 Flaky** across
  the nine existing scenarios plus one new account-library scenario. This includes
  synthetic Bubble/Photo upload, refresh, image loading, standalone Home notes and
  photo-description search. Earlier runs recorded two failures (login expectation
  and a 45-second local scenario deadline); those historical failures are not erased
  by the clean rerun. The first run also identified an expired-session/no-results
  regression, which was fixed. An ambiguous new-test selector was corrected.
- Passed in the disposable browser: full CA fingerprint validation, TLS rejection
  before trust, acceptance using isolated temporary trust with Chromium sandbox
  enabled, and renewed rejection after trust removal. No macOS trust store was
  changed. Non-root execution, dropped capabilities, no privileged mode or new
  published ports were retained.

Docker Desktop temporarily became unavailable. After recovery the clean browser
rerun completed, certificate distrust was reconfirmed and `bubble-browser-library`
was removed. Staging containers/volumes and the original Simulator were preserved.
Normal TLS verification and Chromium's sandbox remained enabled throughout.

Owner additionally confirmed all four Add options, standalone note creation on
Home, required-cover validation and Bubble creation with a cover in Simulator.
A native Add-sheet text warning was fixed by removing stray JSX
spaces; it is covered by automated regression tests. Saving while already on Home
also avoids replacing the current Home route unnecessarily.

Not Tested: standalone Photo creation and detailed image layouts in Simulator, cross-device sync on
physical iPhones, native transfer confirmation/recovery, native offline auth
failure/deep-link behavior, and remaining VoiceOver, focus, zoom, Dynamic Type and
physical-device release gates. Account mode still requires online verification;
the older owner-verified offline local-mode checks below are a separate behavior.

At `9845c4a`, hosted GitHub run 39169748990 passed frontend and backend jobs but
failed its browser job: nine scenarios passed and the new account-library scenario
failed. Improved safe diagnostics in follow-up run 39170452788 identified the photo
search assertion after an immediate reload. The test now waits for the server-
confirmed photo card before refreshing, rather than potentially cancelling the
in-flight upload. Both runs passed frontend/backend jobs and the existing nine
browser scenarios. A follow-up hosted run must verify the corrected test. Keep
PR #11 draft until hosted checks and required native validation are satisfied;
a successful local rerun is not hosted verification.

**Verified release-readiness baseline (2026-10-16): all three GitHub CI jobs Passed** at `2eeee6c5b8e4a793016fd433ff5e209c4b0d7593`: 53 frontend tests, 62 backend tests, TypeScript, web build, backend packaging and all nine browser scenarios. The hosted recovery drill and temporary-trust removal also Passed. See the final hosted evidence below. Two high dependency advisories and human manual gates still block release. Earlier failure/pending records are historical.

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

## Private beta review

See [BETA-TESTING.md](BETA-TESTING.md) for the current execution matrix, safe tester setup, accessibility fixes, evidence and exit gates. The original eight browser scenarios and the new keyboard/responsive scenario are **Not Tested** in this review; listing/type checking is not execution. Real staging browser access failed with `ERR_CERT_AUTHORITY_INVALID` before any UI rendered. The earlier Chromium Mach-port launch restriction remains unresolved; no unrestricted browser runner is available and no warning/security protection was bypassed. All browser UX, responsive and screen-reader checks require human execution or an approved runner with correctly configured certificate trust.

Fresh checks: 52 frontend tests, 62 PostgreSQL/backend tests plus packaging, TypeScript, web export and live HTTPS/account checks pass. The beta UI changes are not yet deployed to the local staging images and do not change storage keys or schemas. Historical counts/walkthroughs above describe earlier reviews.

### Final HTTPS verification follow-up

The current public certificate chain, SAN, validity and served leaf have been verified with TLS validation enabled. The macOS default trust path rejects the private CA, which is absent from the current login keychain. [LOCAL-HTTPS.md](LOCAL-HTTPS.md) provides approval-gated macOS login-keychain SSL, isolated Firefox profile, Windows test-user and Linux Chromium-runner instructions, removal steps and exact public fingerprints. No trust change or warning bypass has been performed. Node's CA setting does not fix browser trust, and trusting the CA does not resolve the independent historical Chromium launch restriction.

Fresh verification passes 52 frontend tests, TypeScript, 62 PostgreSQL/backend tests and executable packaging. The reviewed beta web source builds/exports and runs in the existing private gated stack as `bubble-web:beta-review-fd3edaa`; backend/database artifacts and volume are retained. The original eight scenarios and the ninth regression are **Not Tested** in this follow-up, pending approved trust and a suitable unrestricted runner. All current manual responsive/accessibility rows remain Not Tested; see the final follow-up in BETA-TESTING.md. No additional application defect was confirmed by source review and no application source was changed in this follow-up.

A fresh in-app browser navigation in this follow-up again failed with `ERR_CERT_AUTHORITY_INVALID` before the tester gate or any app assertion. Live gated HTTPS/account checks and container privacy checks pass against the new beta web image with Node's explicit CA; this does not change any browser scenario result.

The owner declined macOS login-keychain changes. An isolated non-root Linux browser container was investigated instead. Its sandbox-enabled launch under default Docker restrictions failed with “No usable sandbox” before CA import or navigation; no CA has been trusted anywhere. The official container-only namespace/seccomp profile is prepared but requires approval before use. This is not a browser-suite execution or app failure. LOCAL-HTTPS.md records the complete fingerprint verification, trust/removal scope and observed prerequisite.

#### Approved container-profile attempt

The approved official Playwright 1.64.0 seccomp profile was re-fetched/verified and its applied contents inspected before startup. The non-root, cap-drop-ALL, no-new-privileges, read-only, no-port container retained Chromium's sandbox and TLS verification. After correcting temporary-home ownership to UID/GID 1001, sandbox startup progressed but failed at `sys_chroot("/proc/self/fdinfo/")`, before navigation/CA import. The official chroot rule requires CAP_SYS_CHROOT, which was intentionally absent; no capability or security bypass was added. The disposable container and its temporary state were removed. All nine application scenarios remain **Not Tested**. A one-rule chroot syscall proposal, without added capabilities, is prepared but not applied pending separate approval. Both macOS keychains remain untouched.

## Final verified browser result

The prior browser-blocked records above are historical. The current isolated Linux run passes **all nine scenarios**, zero failures/skips/flaky results, on Chrome for Testing 156.0.8078.4 / Playwright 1.64.0 against `bubble-web:beta-checked-state`. The sandbox and normal TLS verification stayed enabled. The full CA fingerprint was checked; Chromium rejected the certificate before private NSS import, accepted it after import, and rejected it again after removal. The disposable non-root/cap-drop-ALL/no-port container was removed and neither macOS keychain changed. The owner explicitly approved the official seccomp profile plus its single container-only chroot syscall exception; no further permission or capability was added. See LOCAL-HTTPS.md and BETA-TESTING.md for scope, policy/image hashes and cleanup evidence.

The retained baseline had seven passes and two failures: missing browser checked-state semantics (a confirmed app accessibility defect), and a profile test refreshing before save completion (a synchronization error). The app now exposes checked/current/toggle states through supported browser attributes while preserving native behavior. Existing scenarios assert those semantics; profile persistence waits for the real success confirmation before refresh. The subsequent full suite has nine passes without retries. No assertion was removed to obtain a pass.

After the fixes, 52 frontend tests, TypeScript, 62 real PostgreSQL/backend tests and packaging, web export/container builds, gated HTTPS/security smoke and private-network/container checks pass. Exact pre-existing synthetic fixture data matches after re-authentication of an expired session. No lint script exists. Raw reports/traces are private outside Git; JSON can contain synthetic credentials. Temporary-filesystem artifacts are collected through the live container before teardown rather than relying on stopped-container archive copying.

Full manual responsive/accessibility matrix rows remain **Not Tested**. Automated 375/768/1440-pixel overflow and keyboard/ARIA checks are partial evidence, not physical-device, visual, screen-reader, zoom or complete focus-management certification. Browser verification succeeded in the isolated Linux runner; host macOS trust was intentionally left unchanged. Full manual verification and the documented operational gates remain required before public release.

## Release-readiness CI preparation — 2026-10-16

Base `af922352531da0669d8de60a29b75ec862cd0e17`; branch `release-readiness`.

| Check | Result |
| --- | --- |
| pnpm 10.18.3 frozen-lockfile installation | Passed |
| TypeScript | Passed |
| Frontend unit tests | Passed: 52, no failures/skips |
| Production web export | Passed |
| Java 21 Maven clean verify, real disposable PostgreSQL Testcontainers | Passed: 62, no failures/errors/skips; packaged backend |
| Workflow syntax/expression validation (actionlint 1.7.12, checksum verified) | Passed; optional shellcheck integration not installed |
| Tracked private-key/common access-token pattern scan | No matches; targeted scan, not a complete secret-history audit |
| GitHub-hosted CI execution | Pending; local results do not certify hosted execution |
| Fresh container/dependency vulnerability scan | Not Tested in this change; required for exact release candidate |
| Nine browser scenarios on this CI-only change | Not Tested; previous verified run remains historical evidence |
| Manual responsive, visual, accessibility, zoom, physical-device review | Not Tested; release gates in BETA-TESTING.md remain open |

Local frontend verification used Node 24.19.0 and the pinned pnpm 10.18.3. The workflow targets Node 22 to match the existing frontend Docker build. Hosted Node 22 execution must be verified before requiring the checks. No lint script currently exists; no lint pass is claimed. Initial local unit execution hit the restricted operating-system temporary folder; rerunning with a workspace temporary directory passed all 52 tests.

Security configuration review confirmed secure HttpOnly SameSite cookies, CSRF protection, explicit CORS, fail-fast deployment safety checks, Flyway validation with clean disabled, private loopback staging publication, tester authentication and stripped upstream Authorization. No runtime security configuration was altered. Existing secrets remain outside Git; neither macOS keychain was changed. No staging service was restarted and no application data was modified. See RELEASE-READINESS.md for candidate-specific checks and the approval process.


### Expanded CI and security review

The first hosted PR run [38973583064](https://github.com/hindkhial/bubble/actions/runs/38973583064) passed both frontend and backend jobs at 7200c5f1146a0f7d02030969c02ee30d979c1c16. The expanded run [38974038882](https://github.com/hindkhial/bubble/actions/runs/38974038882) passed frontend/backend at a7ccb08cf93c51978c4f7c4cb2b795a429c7ac3d but failed all nine browser scenarios during launch. Sandboxed browser TLS preflight and trust-removal checks passed. The child process's temporary HOME changed its browser-cache lookup; an explicit installed-browser path is now supplied. The final rerun below supersedes these failures.

After dependency remediation, local frozen install, TypeScript and web export passed; **53 frontend tests pass**, including the new actual shell-quote injection regression. Backend remains 62 passing with real PostgreSQL. Audit changed from 1 critical/3 high/2 moderate to **0 critical/2 high/2 moderate**. The unresolved highs are explicit release blockers in RELEASE-SECURITY.md.

Fresh scans of the existing private staging web/backend/PostgreSQL runtime images reported no vulnerabilities (OS and backend JAR coverage verified); this does not certify later candidate builds. Live private staging network/permissions/health checks and trusted HTTPS/gate/CSRF/CORS smoke passed without restarting operator services or changing user data. No new manual visual, accessibility, zoom, physical-device, secret-rotation or historical-image rollback execution is claimed.


### Final hosted evidence

[GitHub Actions run 38974495598](https://github.com/hindkhial/bubble/actions/runs/38974495598), pull-request merge-candidate validation for source head `2eeee6c5b8e4a793016fd433ff5e209c4b0d7593`: **all three jobs Passed**. Frontend uses Node 22.23.3 and pnpm 10.18.3 on Ubuntu 24.04; backend uses Java 21 and real PostgreSQL Testcontainers. Browser job uses non-root Ubuntu 22.04, Playwright 1.64.0 and Chrome 156.0.8078.4 with sandboxing enabled.

| Actual hosted result | Status |
| --- | --- |
| Frozen lockfile install, pnpm cache, TypeScript, 53 frontend tests, web export | Passed |
| Maven dependency cache, Java 21 compile, 62 tests (no failures/errors/skips), package | Passed |
| All nine existing browser scenarios | Passed: 9 expected, 0 unexpected/skipped/flaky; 88.66 seconds |
| Untrusted TLS rejected before import; fingerprint-verified temporary NSS trust accepted | Passed |
| Health, tester gate, cookie/CSRF/CORS and network isolation | Passed |
| Flyway V1/V2, protected backup and transactional restore to fresh scratch DB | Passed |
| Exact seven-table comparison and application operation against recovered DB | Passed |
| Full service restart with retained volume, rejected old sessions and exact fixtures after reauthentication | Passed |
| Return to original CI source database and final private health checks | Passed |
| Temporary CA removed and fresh-browser TLS rejection reconfirmed | Passed |
| Disposable CI Compose resources/volume and temporary files removed | Passed: cleanup commands completed |

The nine scenarios cover local offline editing/restoration; registration/login/session/logout; note CRUD/pinning/search; checklist edits/completion; profile and themes; failed account writes and explicit local copy; mobile navigation/validation; pending/failed search; and keyboard card options at three viewport widths. These are automated assertions, not full manual visual/accessibility/device certification.

Candidate container scanning remains required before release: the fresh local scan certified the existing staging images, not the later rebuilt CI images. Two unresolved high and two moderate frontend dependency advisories remain recorded in RELEASE-SECURITY.md. No public deployment, release, tag, operator secret rotation or arbitrary historical-image rollback was performed. Final documentation-only commits should be checked against their own PR CI status; this record identifies the exact executed source head rather than inventing a self-referential hash.


## Candidate security and QA follow-up — 2026-10-16

PR #8 remains a draft targeting integration. Candidate follow-up changes are limited to scanner isolation, exact-image scanning within the browser CI job, a compatible-artifact rollback rehearsal and QA/security documentation. No UI, backend APIs, data keys, schema, dependency versions or lockfile changes were made.

Local results: frozen installation, TypeScript, all 53 frontend tests, source-mapped production web export and both candidate Docker builds Passed. Java 21 Maven clean verify also Passed: 62 PostgreSQL-backed tests, no failures/errors/skips, and backend packaging. Fresh pinned Trivy scans of candidate web/backend and PostgreSQL runtime images Passed with zero reported vulnerabilities at all severities; OS/JAR coverage and archive identities were checked. Exact config digests are in RELEASE-CANDIDATE-QA.md. Audit remains 0 critical, 2 high and 2 moderate; no safe published high-severity patches were available. The decoder's installed version was corrected in documentation to 0.2.2, and its fixed ESM-only release was checked against the existing CommonJS consumer before rejecting a blind override.

The first restricted scan failed because database downloads exhausted the bounded tmpfs; no pass was claimed. Downloads now use the owner-only report mount while keeping a non-root scanner, dropped capabilities, read-only root and no secrets/socket mounts. The real candidate scan passed after that change. The first hosted follow-up run also failed at scanning; frontend/backend checks passed. Current per-head hosted browser/recovery/rollback/image results are recorded in the PR checks and PR summary; do not infer them solely from local success or the earlier release-readiness run.

Manual QA: opening actual private staging in the in-app browser Failed with ERR_CERT_AUTHORITY_INVALID. Screen reader, complete keyboard/focus, full visual layouts, browser/text zoom and physical iOS/Android checks were therefore **Not Tested**, not passed. No certificate warning bypass, host trust change or physical-device result is claimed. Use RELEASE-CANDIDATE-QA.md and the existing BETA-TESTING.md matrix for human execution.

Rollback scope: the new automated drill selects distinct metadata-labelled artifacts with the same application/schema, asserts actual image selection, checks fixtures after reauthentication, preserves database container identity and returns to candidate images. This verifies compatible app switching only; destructive/unknown historical-schema rollback remains outside this evidence. Proposed version stays 0.1.0-beta.1. No merge, release/tag or public deployment occurs.

Hosted candidate follow-up [38977872733](https://github.com/hindkhial/bubble/actions/runs/38977872733) at source `c64dad27d039e9271c4aa036971dd4140fa0b911`: all three jobs **Passed**. Verified 53 frontend tests/types/web build; 62 real PostgreSQL/backend tests/package; all 9 browser scenarios (0 failures/skips/flaky); V1/V2 migrations; seven-table backup/restore and recovered-backend operation; compatible artifact rollback/return with database container unchanged; final running-image scans (zero reported vulnerabilities); and temporary trust removal. Scanner identity/digest evidence and unchanged manual gates are in RELEASE-CANDIDATE-QA.md. A final current-head CI run is required after the review-note commit; its results are recorded in the PR summary/checks rather than assigning a future pass here.

Tracked and proposed-file review found no private-key/common GitHub/AWS credential-pattern matches and no new credential dumps, secret files or private user data. This is a targeted review, not a complete historical secret audit.


### Decoder security remediation

A later targeted update resolves the web-exposed decoder advisory: 0.2.2 → official fixed 0.5.0, with a tracked packaging-only patch restoring the callable CommonJS export expected by query-string 7. The parser algorithm is otherwise byte-for-byte upstream code. Blind substitution was first shown to fail; patched real-consumer Unicode/space/array/null round trips and a time-bounded malformed-percent-input subprocess pass. Frozen installation, TypeScript, all **55 frontend tests**, production web export and both iOS/Android bundle exports Passed. Those exports are not physical-device tests. The Docker build copies patch files before dependency installation and Passed. The rebuilt frontend runtime scan reports zero vulnerabilities and its config/archive identity was verified; backend/PostgreSQL image code/identities are unchanged from their clean local scans.

Full audit is now **0 critical, 2 high, 1 moderate** without any audit exclusion. The two high packages have no published fixes; uuid remains moderate. Dependency and lockfile edits are limited to this decoder update/compatibility patch. The historical 53-test/two-moderate and pre-decoder image records above remain baseline evidence only. Current-head GitHub outcomes and fresh image digests are recorded in the PR summary/checks after execution, not inferred from these local results. All required manual gates remain Not Tested.

## Detailed human verification

Use [MANUAL-QA.md](MANUAL-QA.md) for platform-specific screen-reader, keyboard/focus, layout, zoom, text-scaling and physical-device steps. All unexecuted checks remain **Not Tested**. [DEPENDENCY-RISKS.md](DEPENDENCY-RISKS.md) records the unresolved advisories; the two High findings remain release blockers. LOCAL-HTTPS.md specifies proposed profile-only trust and removal controls, with no Mac keychain changes.

### Security-assessment follow-up execution

At source bf9daf57199e49a3b4815114006ebb3cb0971942 with documentation-only assessment changes, local reruns passed: 55 frontend tests (0 failures/skips), TypeScript, production web export, Java 21 Maven clean verify/package with 62 PostgreSQL-backed tests (0 failures/errors/skips), actionlint and diff whitespace checks. Optional shellcheck is unavailable. Full audit still reports 0 critical/2 high/1 moderate, with no muted findings. The live operator certificate matched LOCAL-HTTPS.md and connection-scoped TLS verification passed; no trust-store changes were performed. The subsequent final documentation head must receive its own GitHub checks, including all nine browser scenarios, exact runtime-image scans and synthetic recovery/data-preservation drills; use its exact PR check/run rather than transferring historical results. Human checks in MANUAL-QA.md remain Not Tested.

## iPhone native foundation verification

See IOS-NATIVE.md for the iPhone-first target, approved development identifier, exact native setup steps, storage/photo architecture and separate verification stages. Local TypeScript, 68 tests (including real SQLite file close/reopen, schema rollback/newer-version refusal, corrupt-data/write failures, photo commit/cleanup ordering and HTTPS config), Expo configuration, SDK dependency compatibility and supported iOS prebuild passed. iOS Hermes/assets and browser-regression exports passed; final source checks are reported on the foundation PR. No backend source changed; PR CI reruns backend tests and browser regression checks.

Xcode 26.6 is now installed. The Simulator probe/build attempt failed during restricted CoreSimulator/DerivedData build preparation. CocoaPods was absent at that initial attempt; the subsequent setup below resolves that tool dependency while system Ruby remains unchanged. Native compilation did not pass, Simulator launch and native process-restart persistence remain Not Tested, and no physical device or account cookie flow was executed. Node SQLite reopen tests do not certify the Expo native module on iOS. Do not call the foundation fully validated until a real Simulator build/launch and restart checks succeed. No Apple registration/signing/distribution, cloud build, release or deployment was performed. Existing High dependency findings and human QA gates remain open.

The initial foundation CI run had 8/9 browser scenarios pass; the outage scenario exposed a recoverable-error detail guard unmounting an editor. The guard was corrected to block only initial hydration/missing-content failures. The existing local browser scenario now also injects a storage quota failure and asserts draft retention plus unchanged saved content before retrying successfully. The nine-scenario suite remains mandatory on the corrective head; no pass is claimed for the failed run.

## Simulator build follow-up (2026-10-17)

On ios-native-foundation baseline 8194f4249d1ab7ae976578d36684b9a5f90363cc, approved workspace-only tooling now runs Ruby 3.4.8, Bundler 2.6.9 and CocoaPods 1.17.0. Tool versions/transitive dependencies are pinned by .ruby-version, Gemfile and Gemfile.lock. `bundle check` and `pod --version` passed. CocoaPods installed **110 pods**, generated Bubble.xcworkspace and completed native code generation. React Native's supported project-local cache option resolved an otherwise denied shared-cache write; all six React Native/Hermes archives matched published Maven checksums. No system installation, keychain/security-setting change, native project cleanup or user-data write occurred.

Fresh local Expo dependency compatibility, TypeScript and **68 frontend tests passed**, zero failures/skips. These include Node SQLite file reopen/regression checks, not Expo native process-restart verification. The follow-up changes only tooling pins, ignore rules and documentation; backend and browser suites were not rerun locally and prior CI results are historical. Use the exact follow-up head's GitHub checks separately.

Three real unsigned Debug Simulator workspace build attempts, including a retry after host runtime installation, **failed before compilation (exit 66)**: relative/absolute paths reported workspace recognition errors with CoreSimulator XPC, temporary-file and file-type-detection restrictions. Xcodeproj can parse the workspace and both projects; the recognition error still requires unrestricted Xcode investigation. The runtime registry was initially empty; after the owner completed host setup, iOS 26.5 (23F77) is registered/mounted with verified signature metadata and Intel/Apple Silicon support. The session still cannot enumerate devices/connect to CoreSimulator. Access to host Simulator/cache folders was not granted, and native launch could not be verified.

Install/launch/Home, note editing, checklist completion, native SQLite restart preservation, profile/photo persistence, appearance, navigation/keyboard/safe areas and offline workflows are all **Not Tested**. No critical native defect can be ruled out from this blocked build. See IOS-NATIVE.md for the exact execution matrix and owner Terminal/Xcode continuation steps. Existing unresolved dependency findings and manual accessibility/physical-device release gates stay open. No merge, distribution or deployment was performed.

Tooling commit **d7183b60990f50701d09c5f58956b8ee0181c471**: [GitHub run 39001317314](https://github.com/hindkhial/bubble/actions/runs/39001317314) completed successfully in all three jobs: 68 frontend tests/types/web build, 62 PostgreSQL backend tests/package with zero failures/errors/skips, nine browser scenarios with zero skipped/unexpected/flaky. Temporary browser TLS trust/sandbox controls passed. This documentation-only runtime follow-up must not be presented as a new native test pass; its own head checks are separate.

## Simulator prerequisites and physical-device preparation — 2026-10-17

Baseline 6118f0eccd315fb2377ec58c072c51c396efea2f, with documentation-only device-validation follow-up. Simulator native compilation now Passed: three inspected Xcode activity logs contain Build succeeded and 122-target dependency graphs. Owner screenshots show the installed development client; owner confirmed Home loaded. Owner-executed restart persistence Passed for a synthetic note, checklist and completed-item state. This supersedes earlier build-preparation blockers, not the remaining unexecuted UI/photo/profile/theme/accessibility checks. Missing module maps were observed in the original one-target build without Pods; successful workspace builds include those dependencies. IPv4-first localhost Metro resolved the subsequent development-client connection mismatch.

Fresh frontend preflight: 68 tests Passed, zero failures/skips; TypeScript Passed. Backend behavior is unchanged and backend tests were not rerun locally. No new physical-device build was attempted. Device discovery timed out with CoreDeviceService XPC errors, so phone model/iOS/pairing/team/signing/Developer Mode remain unverified. No Apple credentials or signing-profile contents were accessed. No settings were changed, device installed/erased or data reset.

IOS-DEVICE-TESTING.md separates evidence sources, approvals, the embedded-bundle offline test plan and every physical workflow marked Not Tested. Physical installation, phone-reboot preservation and native networking cannot inherit a pass from Simulator/browser results. Native accounts remain disabled; no network/trust/signing expansion or TestFlight/public deployment is authorized. Existing security/human release gates remain open.

## Simulator polish verification

See IOS-SIMULATOR-TESTING.md for the current scope, baseline source/evidence, exact changed-head matrix and owner-operated session. Local TypeScript, 72 frontend tests and both iOS/web exports passed. A focused storage/photo/motion run passed 15 tests, already included in those 72; these use Node SQLite/adapter operations, not native OS/UI execution. New coverage protects incomplete creation drafts; the existing browser scenario additionally verifies keep-editing/discard and unchanged saved content. Hosted execution of that change is pending at this record. No backend behavior changed; no local backend rerun was needed.

A new unsigned Debug Simulator xcodebuild attempt exited66 before compilation, with CoreSimulator XPC/temp/file-type restrictions and workspace recognition errors. Previous native builds/launch and owner-confirmed note/checklist restart persistence passed on the baseline, but updated native compilation/keyboard/navigation/profile/photo/theme/VoiceOver checks remain Not Tested. Owner assistance in Xcode/Simulator was requested. Physical-device testing was explicitly deferred because the phone connection failed; it remains Not Tested. Do not claim this milestone complete from JavaScript exports or browser/unit results. No dependencies, migrations, signing, security protections or personal data were changed.


## Verified Simulator follow-up — 2026-10-17

This record supersedes pending statuses above for the executed checks only. Application source: 560197b1aada29e0ea7bba1bc0896c282a272b5d. These are owner-operated Xcode/Simulator results, not agent UI automation.

- Passed: fresh native Debug build. Inspected Xcode activity log 5DFE4794-9EFA-4919-899F-1C3E82FAB4A0 (2026-10-17T21:56:24Z, after final application edits) contains Build succeeded and 122 targets.
- Passed: updated Home opens, iPhone 17 Pro Simulator / iOS 26.5.
- Passed: note Cancel → Keep editing retains draft, keyboard-visible controls reachable, save works.
- Passed: search saved note, open/edit/save; checklist edit/add/save/complete; back navigation without reported overlap, stuck navigation or lost text.
- Passed: note/checklist edits and checked state survive restart. Profile name/bio, synthetic profile photo, selected Appearance mode and accent also survive restart.
- Passed locally: TypeScript, 72 frontend tests, iOS Hermes/assets export and web regression build. The 15 storage/photo/motion tests are included in 72 and use disposable Node SQLite/adapters, not native bridge execution.
- Passed on GitHub at this source: frontend checks, 62 PostgreSQL backend tests/package, all nine browser scenarios twice (zero skips/unexpected/flaky), compatible rollback and temporary TLS trust removal/rejection.
- Failed: whole browser CI job twice, after scenarios passed, at scan-private-staging.mjs. Protected logs withhold details; vulnerability versus scanner/infrastructure cause is unconfirmed. No clean image scan or overall CI pass is claimed. Evidence: https://github.com/hindkhial/bubble/actions/runs/39073153574. Documentation-only follow-up heads need their own checks.
- Not Tested: native no-internet check (explicitly skipped by owner); standalone cold-start without Metro; VoiceOver/full focus management; Dynamic Type/Reduced Motion; complete visual/safe-area review; every System/accent combination; photo replacement/removal/denial; full native search filter/empty combinations; every native discard/gesture path; physical-device tests.

The agent CLI remains blocked by CoreSimulator/XPC restrictions; owner build/launch evidence resolves the compilation prerequisite without implying CLI access. A debugger probe returned no usable runtime evidence and wrote no databases. Debug tests used localhost Metro; no standalone offline claim is made. Core workflows passed without reported crashes/data loss; broader unexecuted gates remain open. Native accounts remain disabled. No dependencies, backend/schema, signing, trust stores or user data were changed. No merges, TestFlight or deployment occurred. Existing security findings and the image-scan failure remain release blockers. This record is not release approval.


## Offline verification and CI diagnosis — 2026-10-18

Owner-executed iPhone 17 Pro Simulator / iOS 26.5 check Passed: Mac Wi-Fi disabled and Simulator Safari failed to load an external page; Bubble local-only note creation, editing and deletion, checklist completion, full app stop/reopen and saved-state retention all Passed. Owner confirmed networking restored. This verifies no-internet usage with localhost Metro available, not a standalone embedded-bundle cold-start. No app uninstall, data reset or storage migration was used.

At a9b54e5e30f3d1adddacc41b3a379c9e85969fc8, GitHub run 39075069382 Passed frontend checks, 62 PostgreSQL backend tests and all nine browser scenarios (zero skipped/unexpected/flaky). The image scanner completed and exited 2 because backend and web each had one High and one Medium vulnerability; PostgreSQL had none. This identifies a real vulnerability gate failure, not a scanner/registry failure. Findings remain unsuppressed. Follow-up diagnostics retain only public package/advisory fields and classified scanner failures, never raw reports or staging credentials. Final remediation/check results must be recorded separately.

Local rerun: 72 frontend tests Passed, TypeScript Passed, iOS Hermes export Passed. Native application source and storage formats are unchanged from the successfully built/owner-tested Simulator source. No fresh native compilation is inferred from the export. Agent CoreSimulator restrictions and standalone/physical-device/accessibility gates remain unchanged.


Image remediation candidate: a fresh local scan of the existing backend image identified libexpat 2.8.5-r0: CVE-2026-77214 (High) and CVE-2026-102633 (Medium), fixed by 2.9.0-r0. Upstream evidence: https://github.com/libexpat/libexpat/blob/master/expat/Changes (2.9.0 security fixes). Backend/web Dockerfiles now require libexpat>=2.9.0-r0 from their existing Alpine repositories; base digests and security gate remain unchanged. Rebuilt candidate scans and hosted results must confirm remediation; the historical local image is not the final CI candidate.
