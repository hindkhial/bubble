# Performance and reliability

## Scope and baseline

Work is based on integration commit `c75dc29420483f894a5c3a234297c35e82a9f7d0`, on the dedicated `performance` branch. Original frontend, backend and integration refs are preserved. No dependencies, database migrations, authentication changes, background synchronization or product features were added.

The original integration snapshot was archived into a separate working directory and rechecked: 33 frontend tests, TypeScript checks and 56 PostgreSQL-backed backend tests passed. Browser automation was already incomplete: a repeated Chromium launch attempt still fails with a macOS Mach-port bootstrap permission error before any app assertions. That remains a verification gap, not a browser-test pass.

## Measurements

Synthetic data only, on the same developer Mac with Node 24, Java 21, PostgreSQL 17 in Docker and Spring Boot's existing configuration. These are warm local measurements, not production percentiles, total screen-render times, cold application-load times or deployment SLAs. Host load and JVM/JIT behavior affect timings.

| Workload | Reference | Optimized |
| --- | ---: | ---: |
| Pin ordering: 10,000 entries in one scope, 3 pins; median of 5 runs | 961.38 ms | 1.65 ms |
| Load 20 checklists × 25 rows, plus empty notes page: HTTP requests | 22 | 2 |
| Same real TypeScript/Spring/PostgreSQL load; median of 7 alternating runs | 62.27 ms | 24.65 ms |
| One full 20-checklist service page: prepared SQL statements | 42 | 3 |
| Production web entry JavaScript, uncompressed | 1,295,652 bytes | 1,296,444 bytes |
| Same JavaScript, gzip | 341,758 bytes | 342,044 bytes |

The backend service benchmark also measured 218.00 ms versus 45.15 ms in its final warm 7-sample run. Earlier runs varied substantially, so deterministic request/SQL counts are the stronger evidence. Timing assertions are deliberately excluded from regression tests.

The web entry grew by 792 raw bytes / 286 gzip bytes. This is a small size regression for batching/cancellation/compatibility logic; no bundle-size or initial-load improvement is claimed. Both bundles used archived/current sources, identical installed dependencies and the same Expo web export command. Reproduce locally rather than expecting byte-identical bundles across different paths/toolchain versions.

## Changes

### Collection ordering

The old grid duplicated each scope's pin array once per entry, then repeatedly scanned that large array inside the sort comparator. The new helper visits each scope once, builds a rank map and uses constant-time pin lookups. It preserves first-occurrence pin ordering, stable unpinned ordering, scope behavior and source-array immutability. The component memoizes ordering across its own menu-state renders. No cards, navigation, shapes, colors or theme tokens changed.

### Checklist loading

`GET /api/v1/checklists?includeItems=true` returns the existing checklist DTO with ordered items in a page. It first pages owner-scoped parents, then uses one owner-scoped item query for those parent IDs. It does not fetch-join a collection into the paginated parent query. A full page costs at most three prepared statements: parents, count and items. Partial/empty pages can cost fewer.

Detailed pages allow 1–20 parents and retain the existing maximum 1,000 items per checklist; larger detailed-page sizes return 400. The default summary endpoint remains compatible, including its existing 1–100 page-size range. Search, pin filters, timestamp/UUID ordering and ownership checks are reused. Empty lists contain an empty items array. Queries remain inside a read-only transaction; no entity/relationship is serialized directly.

The frontend now uses detailed pages and no detail-request fan-out on an updated backend. Older backends that ignore the flag fall back to detail reads, at most 10 concurrent requests, preserving existing items rather than presenting editable empty lists. Incomplete fallback details are rejected explicitly. The improvement therefore depends on deploying the updated backend. The app still loads all account pages into memory; this is not UI virtualization or cursor pagination.

### Network cancellation and safety

Search retains its 250 ms debounce and cancels superseded GET requests, including subsequent pages, on query changes or unmount. Cancellation is distinguished from a connection failure. The existing 15-second request timeout, CSRF/session behavior and uncertain-write handling remain intact. No automatic retries were added; non-idempotent writes are never replayed. Local storage formats and save behavior are unchanged.

### Database and pool review

An EXPLAIN check with 10,000 synthetic notes confirms that `idx_notes_owner_updated` supports owner-scoped `updated_at DESC, id` pages. The equivalent checklist index and existing unique `(checklist_id, position)` index support parent ordering and item retrieval. No evidence justified a new index, Flyway migration or pool increase. Hibernate remains `ddl-auto: validate` with Open Session in View disabled. The pool remains at five connections; four concurrent authenticated detailed readers (eight requests, 1,000 rows per list) pass without changing it.

## Reproduction

```sh
pnpm test
pnpm typecheck
pnpm benchmark:local
# Docker running; isolated Testcontainers database:
(cd backend && mvn clean verify)
# Query budgets, plan check and service comparison only:
(cd backend && mvn -Dtest=PerformanceIntegrationTest test)
```

For live HTTP measurements, start the dedicated disposable backend described in [TESTING.md](TESTING.md), then:

```sh
BUBBLE_E2E_DISPOSABLE=1 BUBBLE_TEST_API_URL=http://localhost:8085 \
BUBBLE_TEST_ORIGIN=http://localhost:8091 pnpm benchmark:account
```

The live benchmark creates a fictional account and 20 generated checklists, checks old/new row text/completion equivalence, measures seven alternating samples and deletes only its own created content. The fictional account remains. It never reads browser storage. It refuses remote API hosts and requires explicit disposable-environment acknowledgement. The reference reproduces the former 10-at-a-time detail reads using unchanged summary/detail endpoints; the grid reference reproduces the former sorting algorithm. No private content is logged or sent to analytics.

## Validation and remaining work

- 40 frontend tests pass, zero failures/skips; TypeScript and whitespace checks pass.
- 59 real PostgreSQL-backed backend tests pass, zero failures/errors/skips; Maven executable JAR packaging passes. The three performance tests additionally pass after adding concurrent-reader assertions.
- Live TypeScript/Spring/PostgreSQL checks pass for authentication/session restoration, notes, pins/search, atomic checklist saves/order/completion/item changes, profile/preferences, explicit generated-fixture copying/deduplication, local-original preservation and logout.
- Expo web, iOS and Android exports pass. Native exports prove bundling only.
- Browser walkthrough confirms preserved local content and case-insensitive local search in the unchanged card layout. Full automated browser coverage is still blocked by Chromium's launch permissions. No cold-start, visual-frame-rate or end-to-end browser timing improvement is claimed.
- Large collections still mount all cards, local search scans text, browser localStorage serializes full values synchronously, and account mode reads all pages. Those are remaining candidates for separate measured work.
- Database substring search can scan an owner's text, and deep offsets remain expensive. No speculative cache, Redis or search infrastructure was added.
- Default sample cover assets remain in the export. Removing them needs a separate check of legacy numeric image references; they were left intact to preserve compatibility.
- Local-only mode remains independent and uses the same browser keys. Account mode still requires a connection; there is no offline synchronization, service worker or guaranteed cold offline reload. Multi-request pagination still has no cross-request snapshot guarantee.

## Files

- `src/utils/collectionOrder.ts`, `src/components/CollectionGrid.tsx`
- `src/api/account.ts`, `src/api/client.ts`, `src/app/search.tsx`
- `backend/src/main/java/com/bubble/controller/ContentController.java`
- `backend/src/main/java/com/bubble/service/ContentService.java`
- `backend/src/main/java/com/bubble/repository/ChecklistItemRepository.java`
- `backend/src/test/java/com/bubble/PerformanceIntegrationTest.java`
- `tests/api.test.mjs`, `tests/performance.test.mjs`
- `scripts/benchmark.mjs`, `scripts/benchmark-account.mjs`, `package.json`
- `README.md`, `INTEGRATION.md`, `TESTING.md`, `backend/README.md`, `PERFORMANCE.md`

## Final pull-request review

The original 19-file diff at `7ba7f1f8c511b2aa1e17e5978b3e30d3768161a4` was reviewed together with its callers, storage providers, security configuration and existing tests. Follow-up fixes stay within that file set. The measurements above describe the original optimization run, not a new browser performance claim.

| File | Review focus and outcome |
| --- | --- |
| `INTEGRATION.md` | Batched-read description matches the client/server contract; local/account separation remains accurate. |
| `README.md` | Documentation links only; no runtime changes. |
| `TESTING.md` | Isolated-data requirements retained; added a reproducible manual browser checklist and explicit execution limits. |
| `backend/README.md` | Default summary compatibility and 20-parent detailed-page limit documented accurately. |
| `PERFORMANCE.md` | Synthetic measurements, small bundle regression and verification gaps disclosed; no production-load guarantee. |
| `ContentController.java` | Existing authenticated principal supplies ownership; optional read flag preserves default summaries. |
| `ChecklistItemRepository.java` | Bulk query restricts both parent IDs and their owner, and orders rows by parent/position. |
| `ContentService.java` | Read-only transaction; existing validated page/search/sort rules reused; no collection fetch-join or write. |
| `PerformanceIntegrationTest.java` | Isolated PostgreSQL fixtures; query/page/ownership/concurrency coverage; added before/after snapshots of existing synthetic notes, checklist rows, profile and appearance. |
| `package.json` | Two benchmark scripts only; dependency versions unchanged. |
| `benchmark-account.mjs` | Explicit disposable localhost acknowledgement; fictional account and own-fixture cleanup; outputs aggregate measurements only. |
| `benchmark.mjs` | Synthetic entries and equivalent reference algorithm; no personal content or storage access. |
| `src/api/account.ts` | Complete paginated reads, cancellation propagation, older-server fallback and rejection of missing item arrays prevent empty-list replacement. |
| `src/api/client.ts` | Credentials/CSRF/no-store/timeout/uncertain writes preserved. Review fixed reliance on `AbortSignal.any` and normalized caller cancellation during JSON reading; caller listeners are removed. |
| `src/app/search.tsx` | Superseded reads cancelled; inactive callbacks ignored; existing debounce, filters and error/empty states retained. |
| `CollectionGrid.tsx` | Memo dependencies include entries/scope/pin provider; selection/actions and existing card components retained. |
| `collectionOrder.ts` | Stable ordering, unique scope visits, first pin occurrence and immutable input verified. |
| `tests/api.test.mjs` | Batching/legacy/incomplete-data tests retained; added old-browser cancellation compatibility, body cancellation, listener cleanup and between-page cancellation coverage. |
| `tests/performance.test.mjs` | Large synthetic fixtures, scope ordering, filtering and immutability coverage; no fragile timing assertions. |

No new ownership bypass, CSRF relaxation, unsafe private-content cache, destructive migration, storage-format change or unrelated UI redesign was identified. Read-only code and automated snapshots support data-preservation confidence; tests intentionally do not touch or certify a production database.

The manual fallback checklist is in [TESTING.md](TESTING.md#manual-browser-release-checklist). Browser-runner failures must remain distinct from application assertion failures. GitHub reported no CI check runs or commit statuses for the original reviewed head; local test evidence is not a substitute for an independently executed CI run.

### Review outcome

Final review validation: 43/43 frontend tests; TypeScript and whitespace checks; web export; 59/59 backend tests with no failures/errors/skips and executable JAR build; real TypeScript-client integration checks against both the updated and archived integration backends. The complete backend run used isolated external PostgreSQL after an earlier Testcontainers run failed with two readiness errors. Original iOS/Android exports were not rerun in this review.

Synthetic before/after snapshots confirm existing notes, checklist rows/order/completion, profile/bio and Dark/Sky blue preferences are unchanged by concurrent detailed reads. Partial browser checks reconfirm local persistence/search and account restoration/search/profile/preferences, plus switching back to the separate local workspace. No personal content or original branch refs were changed.

**Ready for code review; merge recommendation remains conditional.** No blocking code defect remains from the 19-file review. The old-browser cancellation compatibility fix and its tests are included. Before merging into `integration`, obtain a successful eight-scenario browser run on an unrestricted runner or record a complete pass of the manual release checklist. This environment still cannot launch either bundled Chromium variant; partial in-app-browser checks do not close that gap. GitHub has no reported automated checks. No merge or deployment was performed.
