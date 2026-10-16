# Release candidate security and QA

Assessment: **not ready for candidate approval or public release**. Version remains proposed `0.1.0-beta.1`. No release/tag, public deployment or merge is authorized by this record.

The security/QA follow-up is added to the existing draft PR #8 because it closes gates already identified by that PR. `frontend`, `backend` and `integration` are preserved. Application UI, API, persistence keys and schema are unchanged; the pnpm lockfile is retained because no compatible security update was found for the remaining findings.

## Dependency exposure review — 2026-10-16

Current full pnpm audit: **0 critical, 2 high, 2 moderate**. No findings are ignored, downgraded or excluded. Published npm versions and the reviewed advisories were checked again, not inferred from an older report.

| Installed dependency | Patched release | Actual observed exposure and decision |
| --- | --- | --- |
| node-forge 1.4.0 — High, GHSA-86w9-cpqp-85rv | None published; npm latest remains 1.4.0 | Installed through Expo CLI/certificate tooling. Its RSA PKCS#1 signature-verification flaw concerns malformed nested ASN.1 sequences/low-exponent keys. Expo certificate helpers call certificate/signature verification. Bubble does not accept these certificates through its notes/account API; staging TLS uses OpenSSL/Nginx/Node, not Forge. No Forge source appears in the inspected production web map. Build/development certificate workflows remain affected: **release blocker**, not dismissed as dev-only. |
| braces 3.0.3 — High, GHSA-vfj7-8cjw-p6xm | None published; npm latest remains 3.0.3 | Installed through Expo/Metro → micromatch; nested brace patterns can exhaust the stack. The reviewed Metro watcher calls micromatch with the fixed `**/*` glob, not note/search input; that call does not demonstrate a reachable nested-brace exploit. Vulnerable brace-expansion APIs remain installed, and the review does not prove all tooling paths unreachable. Neither braces nor micromatch appears in the inspected web map. Untrusted build inputs/tooling remain a risk: **release blocker**. |
| uuid 7.0.3 — Moderate, GHSA-w5hq-g745-h8pq | 11.1.1 or newer | Via xcode 3.0.1. Reviewed xcode call is `uuid.v4()` without an output buffer; the advisory concerns v3/v5/v6 buffer bounds. The installed uuid 7 package is absent from the web map. Expo's separately bundled `src/uuid` implementation is a different artifact and is not certified by that observation. Avoid an unnecessary multi-major transitive replacement; finding stays visible. |
| decode-uri-component 0.2.2 — Moderate, GHSA-vcc3-ghjq-m6fr | 0.5.0 | Present through Expo Router → query-string 7.1.3 and included in the web map: URL decoding has an actual client-side input surface. Fixed 0.5.0 is ESM-only; query-string 7 requires a callable CommonJS export (`require(...)`, then function call). An isolated substitution test confirmed `decodeComponent is not a function` on query parsing. A blind override breaks that contract. A compatible upstream consumer update or separately reviewed adapter/backport is required; unresolved. Previous documentation incorrectly listed the affected range endpoint 0.4.2 as the installed version; corrected here. |

Sources: [Forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). No published safe high-severity update is available under the current dependency graph. Do not downgrade to another affected version or replace cryptographic code with an unreviewed patch. No new high advisory is claimed fixed.

Inventory evidence: a fresh production Expo web export with the candidate HTTPS API origin and source maps outside Git contained 850 source entries: 0 Forge, 0 braces, 0 micromatch, 0 installed uuid@7 entries, and 1 decoder@0.2.2 entry. This is source-map evidence for this web export, not certification of native bundles, build tooling or unknown reachability. No source maps are added to the shipped Nginx image.

## Final-image scan gate

Fresh frontend/backend runtime images are built from the unchanged application source and scanned using the pinned Trivy image. Coverage requires OS packages and backend JAR dependencies; an identity mismatch, scan error or high/critical finding fails. Static frontend JavaScript dependency findings remain governed by pnpm audit/source inventory: a zero-OS-finding image scan does not erase them.

The scanner runs with the invoking non-root UID/GID, all capabilities dropped, no-new-privileges, read-only root, no Docker socket and no secrets mount. Its writable mount contains only protected scan reports, exported image archives and public vulnerability databases. A confirmed initial failure was caused by database-download scratch exceeding a 256 MiB tmpfs; downloads now use the protected report directory without relaxing privileges. No clean result was claimed for the failed run.

The existing private operator stack is not restarted or replaced for image scanning. CI scans the exact newly built/running web/backend/PostgreSQL images before removing its disposable stack. Per-run image config digests/counts are printed in the **Private HTTPS browser checks** job; use the latest successful PR #8 check as candidate evidence. Raw credential-bearing browser reports are never uploaded.


Local scan run (started 2026-10-16T22:44:18.179Z) completed with the final candidate frontend/backend images built in this review. No vulnerabilities were reported at any severity in these runtime images; npm findings above remain unresolved. Image config identities:

| Runtime | Scanned config digest | Findings |
| --- | --- | --- |
| backend | `sha256:a038a619fe1070f4ae1e624a3b6432fb2de8a10386d459363761b8fb0d6686e3` | None reported |
| web | `sha256:fbd6c5497634675716b158f10486a57455ef69e42ee31d4aaccc8ca19c548004` | None reported |
| db | `sha256:d89c03006f679a056dd0b2b650e0ea801ef98e297bb5f879c593f684d44dd7e1` | None reported |

## Automated verification and rollback scope

Local frozen installation, TypeScript and all 53 frontend tests and Java 21 Maven packaging with 62 PostgreSQL-backed tests passed after scanner changes; production web export and frontend/backend Docker builds passed. Existing authenticated, ownership/CSRF, isolation, migration, account/local-mode and persistence coverage is rerun by CI; inspect the exact source head in PR #8 rather than transferring a historical pass.

The existing nine browser scenarios remain mandatory with Chromium sandbox and normal TLS verification. Their Linux test-only NSS trust is removed and rejection reconfirmed afterward. CI also verifies V1/V2, backup/transactional restore, seven-table equality, recovered-backend operation and restart persistence. The added rollback drill switches to distinct, metadata-labelled compatible artifacts and back while preserving the exact database container and synthetic fixture data. It uses the same application/schema and does **not** certify arbitrary historical releases or destructive migration downgrades. Such a release requires its own compatibility review and restore plan.

## Hosted verification evidence

[GitHub run 38977872733](https://github.com/hindkhial/bubble/actions/runs/38977872733) passed all three jobs at `c64dad27d039e9271c4aa036971dd4140fa0b911`. Frontend: 53 tests, TypeScript and web build. Backend: 62 PostgreSQL-backed tests and packaging. Browser: 9 passed, zero skipped/unexpected/flaky (89.33 seconds), sandbox/TLS prechecks and trust removal. New recovery, compatible artifact rollback and final-image scans also Passed. Scanner coverage binds each archive to the running image; no runtime vulnerabilities were reported. CI scanned config digests:

| Runtime | Hosted scanned config digest | Findings |
| --- | --- | --- |
| backend | `sha256:23f472ddabd044afbdf56d13b762c751eb13352bfad6875cd90b7fd2d8d8ae4b` | None reported |
| web | `sha256:1371a1407a6fbb536bae1a44cec9dcb97e9abf312efa20b82f0a3e682dd8f731` | None reported |
| db | `sha256:8458bc8698872f978d2f944490512c08aae64e6ac4ee1e48775335356ca92ffb` | None reported |

These identify this executed candidate, not arbitrary future builds. Final follow-up commit status is available in PR #8; each new candidate must pass its own checks. No manual QA outcome is inferred from these automated passes.

## Manual QA execution record

Only synthetic data may be used. The in-app browser attempted `https://localhost:8443` and failed with `ERR_CERT_AUTHORITY_INVALID`. No warning bypass, TLS-ignore option or host keychain import was used. This prevents execution of the actual private staging interface through that browser. VoiceOver/TalkBack control and physical devices are not available to this agent. Automated browser assertions do not count as the following manual passes.

| Required check | Result | Human checklist and expected outcome |
| --- | --- | --- |
| Screen-reader usability | Not Tested | In an approved trusted browser/device, enable VoiceOver, NVDA or TalkBack. Navigate Home, Search, Add, You, account forms and all dialogs. Verify names, roles, state changes, validation and save/error announcements without duplicate/confusing output. Record browser/reader versions. |
| Complete keyboard/focus management | Not Tested | Tab/Shift-Tab through all routes, editors, menus, profile, appearance and auth forms. Use Enter/Space/Escape; verify visible focus, meaningful order, dialog containment, focus return, no traps and no hidden controls focused. Test validation and failed saves as well as happy paths. |
| Mobile/tablet/desktop visual review | Not Tested | At representative phone, tablet and desktop widths, inspect every route/modal in light/dark and each accent. Check cream/pastel identity, card shapes, labels/errors, long titles/bios/checklist rows, empty states, safe-area navigation, clipping and horizontal overflow. Automated width assertions are partial coverage only. |
| Browser zoom and text scaling | Not Tested | Test browser zoom at 200% and 400%, plus increased text-only/device font scaling. Verify reflow, reachable buttons/forms, readable errors, no overlapping bottom navigation or truncated critical content. |
| Physical iOS device | Not Tested | Record device/iOS/browser version. Test touch, keyboard/viewport changes, safe areas, photo picker permissions, local persistence after close/reopen, account login/refresh/logout and all core note/list/profile/theme flows. |
| Physical Android device | Not Tested | Record device/Android/browser version. Repeat core/touch/keyboard/font-scaling/photo-permission and persistence/account checks; inspect Android back navigation where applicable. |

Use the full BETA-TESTING.md matrix as well. For every human result record candidate SHA, device/browser/tool versions, tester, date, Passed/Failed/Not Tested and issue/evidence reference. Keep fixtures/screenshots private. If trust is unavailable, stop and follow LOCAL-HTTPS.md's isolated trust guidance; do not weaken HTTPS, disable authentication or import a CA into a host/device trust store without approval.

## Approval decision

Do not approve a controlled release candidate while the two high advisories remain unresolved without a separately reviewed security decision, or while required manual gates are open. Image and CI success alone do not provide public release approval. Preserve proposed version `0.1.0-beta.1` until explicit approval; never automatically merge PR #8.
