# Bubble Milestone 07 — integration review

## Branch strategy and audit

The integration branch is based on frontend `ac9249d7c7eb827a23004e3ee9d58f441562aac0`. Backend `06340dfffb8ce1146d14173e4b47e8e89239aabb` differs from that frontend only under `backend/`; there were no frontend conflicts. Only that backend directory was brought across, retaining its implementation. The final integration commit has frontend as its first parent and the verified backend commit as its second parent, preserving both histories without a blind merge or force-push. Original branch refs are not changed. The review PR targets `frontend`; do not merge it automatically.

Pre-change checks verified 12 frontend tests/type checking and all 55 backend tests, including actual PostgreSQL migrations/authentication/ownership. Existing Expo 57 / React Native / React 19 / TypeScript 6 conventions, browser storage, cards, navigation and editors were reused. No new frontend/application dependencies or database migrations were introduced.

## Workspaces and privacy

- **Local mode** is the default. It makes no account API calls. Existing browser keys (`bubble.items.v1`, `bubble.bubbles.v1`, `bubble.pins.v1`, `bubble.profile.v1`, mode/accent keys) remain separate. Existing corrupt-data/read/write safeguards are retained. Browser data is tied to its origin: changing development ports does not migrate it.
- **Account mode** is explicitly selected by signing in or resuming a session. Notes, checklists, pins, supported profile fields and appearance come from PostgreSQL. Local profile and appearance are not uploaded or overwritten. Account content is held in memory and reloaded using the HttpOnly server session on refresh. Only a workspace-choice flag is saved locally; no password, session cookie or CSRF token is placed in localStorage.
- **Use local mode** hides account content and restores local data; it does not invalidate the server session. Use **Sign out** on a shared device. Failed logout keeps the account state visible and reports the failure rather than claiming success.
- Bubbles and photos lack backend models/uploads. They stay local. The account library is a virtual navigation container, not a fabricated server collection. Account profile statistics count actual notes/lists; local statistics preserve the existing definitions.
- Account mode needs a connection. There is no offline write queue, service worker, two-way synchronization, conflict merge or automatic background upload. A lost mutation response is marked uncertain, never retried automatically, and blocks further writes until an explicit refresh. Editors retain failed drafts. After an uncertain create, inspect the account before attempting another create.
- Notes/checklists are confirmed by the server before appearing as saved. Checklist full-editor saves use new atomic endpoints, avoiding partially-created/updated lists from several independent item requests. Individual existing item APIs remain supported.

## Explicit one-time copying

In the account screen, choose **Review local notes and lists**, select individual entries, then choose **Copy selected items to my account**. Nothing is uploaded just by reviewing or signing in. Photos, Bubble grouping, pins, local profile and local appearance are not copied. The result is a copy with new server UUIDs; local originals are never deleted or modified.

A browser ledger scoped to API base URL and account ID records each local ID as pending before any write and complete only after an acknowledged response. Confirmed IDs are skipped on subsequent copies. Duplicate local IDs and malformed local data are rejected before uploading. Definite 4xx rejections remove the pending marker so a corrected entry can be retried explicitly; unknown outcomes remain blocked. Storage failures disable the copy rather than risking an untracked upload. If the outcome is uncertain, pending entries are blocked from automatic retries even after refresh. Inspect server content and reconcile manually; there is no automated reconciliation/reset UI in this milestone. Editing a local item after it was copied does not update its account copy.

Copying is sequential per item, not an all-selected-items transaction. Earlier acknowledged copies remain if a later copy fails. The UI reports the failure, refreshes account content and retains the originals. Existing ledger entries are not cleared on sign-out. This protects against duplicate uploads but does not establish a permanent synchronization relationship.

## Local startup

Requirements: Node.js 22.6+ (verified with 24), pnpm, Java 21, Maven 3.6.3+, Docker/PostgreSQL. Dependency installation uses the existing lockfile.

```sh
git switch integration/milestone-07
pnpm install --frozen-lockfile
# Export database credentials outside version control; do not regenerate credentials for an existing volume.
export DB_USERNAME=your_local_role
export DB_PASSWORD=your_private_local_password
export DB_URL=jdbc:postgresql://localhost:5432/bubble
export SPRING_PROFILES_ACTIVE=local
export CORS_ALLOWED_ORIGINS=http://localhost:8081
# Terminal 1:
(cd backend && docker compose up -d --wait && mvn spring-boot:run)
# Terminal 2:
EXPO_PUBLIC_API_URL=http://localhost:8080 pnpm web --port 8081
```

The sample password above is a placeholder, not a supplied credential. Prefer securely setting the variable without leaving real secrets in shell history. See backend/README.md for existing-volume handling and full security configuration. The root `.env.example` documents the public backend URL; a private `.env.local` may contain it. **EXPO_PUBLIC_ variables are bundled into the frontend and must never contain secrets.** The URL is the origin or reverse-proxy base, without `/api/v1`. An invalid account URL reports an error when account mode is used while local mode remains available.

Use the same hostname for frontend/backend (localhost on both, not mixed with 127.0.0.1). Add the exact frontend origin if using another port; there are no wildcard origins. For constrained environments, set `TMPDIR` to a writable temporary directory for Expo exports and `CI=1` if watching is unavailable; restart the dev server after source edits in CI mode. The validation preview used port 8082 with an explicitly allowed development origin and a separate disposable PostgreSQL database, leaving existing development origins/data untouched.

Production is not deployed. A future production setup must use same-site HTTPS, `prod` alone, explicit CORS if cross-origin, trusted ingress protections, and Secure cookies. Cross-site deployments/native account cookie handling need a separately agreed design.

## API boundary

`src/api/client.ts` centralizes configurable URLs, credentialed fetch, CSRF, timeouts and sanitized errors. CSRF tokens stay in memory, are obtained before mutations, and are refreshed after login/logout or a forbidden response. No mutation is automatically retried. The global browser fetch receiver is explicitly bound and regression-tested.

`src/api/account.ts` maps typed responses to existing file/checklist shapes, reads every collection page, deduplicates IDs across shifting pages, and fetches checklist detail in bounded batches. Backend search uses `q` on notes/checklists; local mode keeps its original full local search. Account search is debounced and stale results are discarded. There is no snapshot isolation across paginated reads.

Connected endpoints:

- `GET /api/v1/auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /users/me`.
- Notes: GET collection (including note bodies), POST, PATCH, DELETE, with search/pagination and pin updates.
- Checklists: GET collection/detail, PATCH pins, DELETE, plus full-draft creation/edit endpoints below. These manage item text, completion, insertion, deletion and order without losing atomicity.
- `GET/PATCH /profile` and `GET/PATCH /preferences`. SYSTEM appearance follows the device color scheme. Profile saves send changed fields only, preserving nullable bios and unchanged legacy avatar references. Account avatars accept `avatar:<UUID>` or removal; there is no upload/asset rendering service. Local image/color/emoji controls remain local.

New integration-only backend endpoints:

- `POST /api/v1/checklists/with-items` → 201, full checklist.
- `PUT /api/v1/checklists/{id}/content` → 200, full checklist.

Body: `{"title":"Shopping","items":[{"id":null,"content":"Tea","completed":false}]}`. Existing rows use their server UUID; new rows use null/omission. Array order is saved order. Title is nonblank/max 100; at most 1,000 nonnull valid rows with nonblank/max 10,000 text; byte limits still apply. Existing IDs must belong to that owned checklist and occur once. Missing old rows are deleted within the transaction. Parent row locking, temporary positions and database uniqueness preserve concurrency/integrity. Any invalid/foreign ID rolls back the whole draft. Server ownership always comes from the session, never request user IDs. No V1/V2 edits or new migrations were needed.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build:web
pnpm export:mobile
(cd backend && mvn clean verify)
# Explicitly target a disposable local backend only:
BUBBLE_TEST_API_URL=http://localhost:8080 pnpm test:account-live
```

The live script creates a fictional disposable account and generated fixtures; it does not read browser storage or use real user credentials. It verifies the actual TypeScript API layer → Spring Security → PostgreSQL boundary, including copying generated in-memory fixtures and retaining their fake originals. It deletes only that script-created account's content and leaves its disposable account row. Never target personal/production data. It refuses non-localhost API hosts.

Final validation results are recorded below. No lint script is configured; whitespace checks and TypeScript checks were run instead of claiming ESLint coverage. Native exports validate bundling, not on-device account functionality.

Browser checks verified real registration/login, note creation, persistence/session restoration after refresh, separation of a disposable local original on sign-in, mode switching and local preservation after refresh. The copy review/selection screen was inspected. **Submitting the selected local note in the browser was blocked by automatic approval review and was not executed.** The earlier live generated-fixture test and mocked copy safety tests passed; they are separate from that unexecuted browser submission. Approval is needed before completing that one browser copy check.

## Changed files

The backend project was imported intact from the verified backend parent; within it, only `ContentDtos.java`, `ContentController.java`, `ContentService.java`, `ContentIntegrationTest.java`, `HardeningIntegrationTest.java`, and backend README gained integration changes. Original backend history remains reachable as the second parent.

Frontend/integration changes:

- `.env.example`, `.gitignore`, `package.json`, `README.md`, `INTEGRATION.md`
- `src/api/{client,account,importLocal}.ts`
- `src/state/{Account,Content,Pins,Profile}.tsx`
- `src/theme/Theme.tsx`
- `src/app/{_layout,account,index,search,you}.tsx`
- `src/app/{bubble,file}/[id].tsx`
- `src/components/{AccountNotice,AddPreview,AppearanceSheet,CollectionGrid,EditContentSheet,EditProfileSheet}.tsx`
- `tests/api.test.mjs`, `scripts/account-smoke.mjs`

No dependencies were added. No original branch refs were modified, no real local content was uploaded, and no deployment or automatic merge was performed.

### Final check results

- Frontend: **31/31 tests passed**, no skips; TypeScript `--noEmit` passed.
- Backend: **56/56 tests passed**, no failures/errors/skips; Maven executable-jar packaging succeeded using real PostgreSQL/Testcontainers.
- Expo web, iOS and Android exports passed. The first export failed because the default system temporary directory was not writable; setting `TMPDIR` to a writable workspace directory resolved it. No native device/simulator account test is claimed.
- A real TypeScript client/Spring/PostgreSQL smoke run passed registration, failed/successful login, session retrieval, notes CRUD/pin/search, atomic checklist order/completion, profile/avatar and SYSTEM appearance updates, generated-fixture copying/deduplication/local-original preservation, delete and logout. This run occurred before the separate manual browser copy submission was blocked; it did not read real browser data.
- Browser: registration/login, note creation, refresh persistence/session restoration, no automatic upload on sign-in, mode switching and local-original persistence passed. The selected-note copy submission remains unexecuted pending approval.
- No configured ESLint script exists; `git diff --check` and type checking passed.
