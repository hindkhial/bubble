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

- Frontend: 40 unit tests pass; TypeScript checks pass.
- Backend: 59 tests pass, zero failures/errors/skips; executable JAR packaging passes with real PostgreSQL/Testcontainers.
- Live TypeScript/Spring/PostgreSQL check passes with isolated data.
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
