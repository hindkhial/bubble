# Controlled beta checklist

Proposed version: **0.1.0-beta.1**. Status: **not approved for release**. Complete evidence against the exact candidate SHA; never infer a pass from a script existing.

| Gate | Status | Evidence / action |
| --- | --- | --- |
| PR #7 merged; original branches preserved | Passed | integration af922352531da0669d8de60a29b75ec862cd0e17 |
| Frozen frontend install, TypeScript, unit tests, web export | Passed | Initial local and hosted CI; final candidate results in TESTING.md |
| Java 21 compile, PostgreSQL tests, packaging | Passed | 62 local and hosted tests; final candidate results in TESTING.md |
| Secure browser CI, nine scenarios | Passed | GitHub run 38974495598; 9 passed, none skipped/flaky |
| Final candidate container scan | Passed | Fresh local images and hosted run 38977872733 at source c64dad2 passed; digests in RELEASE-CANDIDATE-QA.md. Require each new candidate head job |
| Dependency security release gate | Failed | Two unresolved high advisories; see RELEASE-SECURITY.md |
| Current private health/TLS/network verification | Passed | Live operator staging and disposable hosted CI; TESTING.md |
| Backup/restore and compatible rollback rehearsal | Passed | Hosted run 38977872733: distinct compatible artifact selection/return, exact fixtures and unchanged DB container. Same code/schema; no arbitrary historical downgrade guarantee |
| Candidate-specific recovery drill | Passed | Hosted source 2eeee6c: seven-table restore, recovered backend and restart persistence; repeat after runtime/schema changes |
| Incident/rotation procedure review | Passed | Procedure documented in RELEASE-OPERATIONS.md; execution not claimed |
| Screen reader testing | Not Tested | Human execution required |
| Complete keyboard focus-management testing | Not Tested | Include all dialogs, focus return and tab order |
| Mobile/tablet/desktop visual review | Not Tested | Automated width assertions are partial evidence only |
| Browser and text zoom | Not Tested | 200%/400% browser zoom, text scaling and reflow |
| Physical iOS device | Not Tested | Device/browser/version and outcome required |
| Physical Android device | Not Tested | Device/browser/version and outcome required |
| Required branch checks configured by administrator | Not Tested | Require all three named CI jobs after successful runs |
| Owner approval to release/deploy | Not Tested | Explicit approval required; no automatic release |

Use the full manual matrix in BETA-TESTING.md. Record date, candidate SHA, environment, tester, Passed/Failed/Not Tested, and issue reference for each result. Keep synthetic fixtures only; never publish real notes, passwords, dumps, traces or screenshots containing private data.

Release sequence: resolve blockers → verify candidate/restore/rollback → complete human gates → owner review → separate approved release/deployment task. A green build is not release approval.

Security/QA follow-up: RELEASE-CANDIDATE-QA.md records actual exposure and detailed human execution steps. The per-head PR check is authoritative for newly added automated scan/rollback checks; earlier Passed entries identify their historical scope. Required human checks above remain Not Tested.
