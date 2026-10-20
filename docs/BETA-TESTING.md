# Private beta testing

## Scope and current decision

Reviewed on 2026-10-16. PR #6 was reviewed and merged into `integration` at `1ed5bb0beac7f737c57175242c26500676169b6d`; `beta-testing` starts from that merge. Original `frontend` and `backend` branches are preserved.

**Current automated result: all nine browser scenarios Passed**, zero failures/skips/flaky results, on the fixed private web image using sandboxed Linux Chromium and an isolated certificate store. Both macOS keychains remain unchanged. Source review and passing browser/frontend/backend checks support merging this focused PR into integration after normal human review. No merge or public deployment was performed.

**Manual beta sign-off remains incomplete:** the matrix below is Not Tested as a full manual process. Automated functional/keyboard/viewport checks are partial evidence; full screen-reader output, focus management, visual spacing/zoom and real mobile keyboard review still require human execution. Tester/release sign-off is separate from code merge readiness. No remote infrastructure or tester invitations were performed. Certificate trust instructions, exact fingerprints, approved container policy and earlier prerequisite failures are recorded in [LOCAL-HTTPS.md](LOCAL-HTTPS.md).

## Safe tester setup and process

1. A coordinator uses the existing loopback-only setup in [STAGING.md](STAGING.md). Keep HTTPS, the tester gate, CSRF, secure cookies and private database network enabled. Do not publish ports, create a tunnel, forward the port, or share the database. Testers currently need access to this host or their own separately configured local stack; remote beta access needs a separately approved private-access plan.
2. Use an isolated browser profile, an empty dedicated workspace and synthetic accounts/content. Never clear an existing personal profile or import a real user's notes. Record any existing synthetic fixture's text, checklist order/completion, profile and preferences before testing it.
3. A trusted operator verifies the local certificate fingerprint/hostname/expiry and configures trust for only the public test CA certificate in the isolated test environment under their security policy. Do not bypass warnings, disable verification, install/share the CA private key, or add broad trust automatically. CLI `NODE_EXTRA_CA_CERTS` does not configure the browser. Renew the seven-day certificate before expiry using a coordinated replacement; preserve database passwords/volumes.
4. Give authorized testers separate bcrypt gate entries and deliver credentials privately. Keep Bubble account credentials separate. Never paste credentials, cookies, traces, real content or personal data into GitHub/chat. Gate credentials can remain cached after Bubble logout: close the isolated profile at the end and verify revocation by removing the tester entry and recreating web as described in STAGING.md.
5. Record the tested commit and image IDs, date, browser/version, OS, viewport, workspace mode, theme/accent, steps, expected/actual result and **Passed / Failed / Not Tested** for each row. A Passed result requires observed execution. Attach only redacted synthetic screenshots; raw traces stay private outside Git. The final-verification record below identifies the newer private web image; use that reviewed artifact when validating UI fixes.
6. Triage data loss, account isolation failures, authentication bypass, public access or broken TLS as blockers: stop testing, preserve evidence/backups and restrict access. Do not reset volumes, automatically retry uncertain writes, weaken security or merge/deploy to work around a failure. Cosmetic issues can be scheduled after functional blockers.
7. Finish all rows on an unrestricted trusted browser before inviting users. Obtain approval for any remote deployment. Complete browser verification remains mandatory before public release. Keep the beta PR unmerged pending review.

## Manual execution matrix

Run the functional rows in **both local-only and account mode** where supported; explicitly record unsupported capabilities rather than inventing them. Use fresh fictional fixtures such as a note containing “violet tea” and a three-row checklist. Read each expected result, then record evidence in a private copy of this table.

| ID | Procedure and expected result | Current result |
| --- | --- | --- |
| B01 | Open the HTTPS URL with a trusted, unexpired matching certificate. Missing/wrong gate credentials deny access; approved tester credentials reach Home without a TLS warning. Home/Search/Add/You remain reachable and empty states are helpful. | Not Tested |
| B02 | Register a unique example.test account, test validation and an incorrect password, then sign in correctly. Errors are useful without exposing account existence or secrets; repeated activation does not duplicate registration. | Not Tested |
| B03 | Create a local Bubble, note and checklist; in account mode create a note/list in the account library. Open each from Home and direct URLs. Account mode does not offer unsupported Bubble/photo creation. | Not Tested |
| B04 | Edit note title/body including Unicode and multiline text, Save, reopen and refresh. Exact values remain. Cancel/discard keeps the previous saved values and warns about dirty drafts. | Not Tested |
| B05 | Create three checklist rows, add/remove one, complete/uncomplete another, reopen and refresh. Text/order/completion remain correct. Creation uses the plus action; no completion control is required before creation. No reorder UI currently exists. | Not Tested |
| B06 | Use each card's labeled options button with keyboard and pointer; pin/unpin, refresh, verify order and the local three-pin limit where applicable. Pinned icons and unpinned options remain distinguishable. | Not Tested |
| B07 | Search mixed-case titles, note body and checklist row text; local mode also searches Bubble/photo details. Verify All/Notes/Lists and local Bubbles filter, clear, no-match state and correct editor opening. Rapid queries never show stale results; pending/failed account searches do not claim no matches. | Not Tested |
| B08 | Edit fictional display name/bio; local emoji/color/photo avatar and account avatar reference only where supported. Save/Cancel/validation, greeting and refresh reflect the correct profile without overwriting the other workspace. Account photo upload is unsupported. | Not Tested |
| B09 | Change Light/Dark and every accent in each mode; account System follows device appearance. Refresh/reopen and verify all labels, captions, errors and destructive actions remain readable. Local System mode is not offered. | Not Tested |
| B10 | Refresh direct routes, close/reopen the isolated profile with storage retained and resume an account session. Compare exact notes/lists/profile/preferences. Expired sessions show sign-in feedback and hide stale account data. | Not Tested |
| B11 | Sign out, reject reuse of the old Bubble session, and verify local originals/profile/theme return unchanged. Reload and sign in again. The outer tester gate is separate and may remain cached. | Not Tested |
| B12 | Use local-only mode without registering, with the backend stopped. After loading needed routes, disable network; create/edit local content, restore network and refresh. Exact changes survive and no account upload occurs. Cold offline loading is not guaranteed. | Not Tested |
| B13 | Create distinct local/account content and profile/theme values; repeatedly switch modes. Nothing automatically uploads, mixes or disappears. Explicitly copy only new selected fixtures; a repeat copy skips acknowledged items and local originals remain exact. | Not Tested |
| B14 | With an edited account draft, stop only the disposable backend or block only its API. Save retains the draft and reports failure. Restore connectivity and inspect persisted state before retrying an uncertain write. Local content is unchanged. Failed searches show useful errors. | Not Tested |
| B15 | Before/after navigation, searches, pins and mode changes, compare all unrelated synthetic notes/checklists/profile/preferences exactly. Delete only a fixture you created and verify confirmation/Cancel and refresh; unrelated content remains. | Not Tested |
| B16 | Restart the local services safely, without deleting the volume. Old in-memory sessions are rejected; signing in restores exact account fixtures. Browser local content/profile/theme remain unchanged. | Not Tested |
| R01 | At 320×740 and 375×812, test every screen and sheet, long titles, multiline text, validation and an open software keyboard. No page overflow, clipped buttons, hidden bottom navigation, unreadable content or unreachable Save/Cancel. | Not Tested |
| R02 | At 768×1024 and landscape tablet size, repeat navigation, grids, editors and profile/settings; inspect spacing and scroll reachability. | Not Tested |
| R03 | At 1440×900 and at 200% browser zoom, repeat screens/sheets. Check text wrapping, readable widths, navigation and no two-direction page scrolling. | Not Tested |
| A01 | Use Tab/Shift+Tab/Enter/Space throughout, including card options and checklist completion. Focus is visible and logical; dialogs keep focus appropriately, Escape/Cancel works, focus returns to the trigger, and no trap prevents leaving. | Not Tested |
| A02 | With VoiceOver or NVDA, check screen headings, input names, button roles, checkbox/radio state, errors and search/loading announcements. Decorative icons must not duplicate labels. Check dialog title/semantics and focus restoration. | Not Tested |
| A03 | Enable reduced motion before opening, then change it while Bubble is open. Modal/route transitions stop; disabling the preference restores normal transitions. Verify pointer interactions do not cause discomfort. | Not Tested |
| A04 | Inspect light/dark text, placeholder text, selected/unselected controls, custom Bubble colors and photos for contrast and visible focus. Token tests are partial evidence, not a full rendered accessibility audit. | Not Tested |

## Final passing browser run

On 2026-10-16 at 22:46 Africa/Casablanca (21:46 UTC), the complete nine-scenario suite ran on **Google Chrome for Testing 156.0.8078.4**, Playwright 1.64.0, Linux amd64 in the disposable test container. Duration was about 91.5 seconds. The retained JSON report records **9 expected passes, 0 unexpected failures, 0 skipped, 0 flaky**; configured retries are zero. Tests ran against the updated existing private HTTPS stack, using fictional accounts/content and fresh browser contexts. No personal browser profile/storage was used.

| Browser scenario | Final result |
| --- | --- |
| Local offline editing/creation, refresh and storage restoration into a new context | Passed |
| Registration, invalid credentials, session restoration, expiry and logout | Passed |
| Account note creation/editing, pinning, body search, direct refresh and deletion | Passed |
| Checklist completion, editor add/remove, row content and persistence | Passed |
| Account profile/bio and Light/Dark/System/accent persistence | Passed |
| Failed account-save draft retention, explicit local copy and local-original preservation | Passed |
| Mobile navigation, empty/clear search, validation, local profile/emoji persistence | Passed |
| Pending/failed account searches do not claim no matches | Passed |
| Keyboard card options/pinning and no page overflow at 375, 768 and 1440 pixels | Passed |

### Failures found and corrected

A retained baseline browser run had **7 Passed / 2 Failed**, not a clean pass. It identified a real accessibility defect: the checklist saved completion (HTTP 200 and a visible checkmark), but React Native Web did not expose legacy `accessibilityState.checked` as `aria-checked`. Checked state now uses the current cross-platform `aria-checked` alias in detail/editor checklists, local-copy choices and appearance radios. Web navigation exposes `aria-current`, and filter/avatar toggle buttons expose `aria-pressed` while preserving native selected state. Existing browser scenarios now assert these states as regressions; no new dependency or replacement mock was introduced.

The profile scenario had a test synchronization defect: it refreshed immediately after clicking Save, before the async save had completed; the trace showed no completed profile patch before refresh. It now waits for the existing **Profile updated.** success message and editor closure, then refreshes and verifies exact persisted values. The test still checks the persisted name/bio and all appearance modes. This is not a claim that refreshing during an unconfirmed in-flight save is safe.

An earlier failing suite attempt completed but detailed temporary reports were not retained before container exit. It is not counted as a pass. The retained baseline above and final run both have private result records. Collection was corrected to stream artifacts out of the live temporary filesystem before teardown; no new host directory mount was added. Raw JSON/traces can contain synthetic credentials and remain outside Git in the protected operator workspace.

### Security and cleanup evidence

The owner separately approved the official version-matched seccomp profile and the single chroot rule exception. The applied policy was verified to differ from the official profile **only** by removing that rule's capability condition; its recorded SHA-256 is `322b86b4f7f5b597ed6a9c2cfd6193a4b249a51c8bc9cfba8ff1a485070b24e8`. No additional permission was used.

Before each run, Docker inspection confirmed non-root `pwuser` UID/GID 1001, ALL capabilities dropped, no added capabilities/SYS_ADMIN, no privileged mode, no-new-privileges, read-only root, temporary home/tmp and no host ports or host directory mounts. Only the public CA and two test scripts were mounted read-only. Synthetic gate credentials were provided privately through stdin and copied owner-only into temporary home. The browser shared the existing web container's network namespace to reach the same `https://localhost:8443` without publishing another port; this grants only that existing network reachability, not host filesystem/Docker access.

The **complete CA fingerprint** matched LOCAL-HTTPS.md before import. A fresh sandboxed Chromium rejected the certificate without trust; after adding only that CA with SSL trust to its private NSS store, normal certificate/hostname/expiry verification succeeded and Bubble rendered. After the suite, the CA was deleted and another fresh browser again rejected the certificate. The disposable container and temporary state were then removed; absence was verified. No browser/system-wide certificate exception or TLS/sandbox bypass was used. Both macOS keychains remain untouched; read-only host verification still rejects this private CA as expected.

Tested artifacts:

- Web: `bubble-web:beta-checked-state`, image ID `sha256:13e43dc7d4b707acaa331112d3b341137eecca655e22005f04b3a303a3c72d52`.
- Test runner: `bubble-browser-review:checked-state`, image ID `sha256:52a28a218f33922fa6f5e930b6949fb188444403a4f41d81f889cfdb6f950dae`.
- The protected web-only Compose override selects the fixed web image. Backend/database images and the data volume were retained. Application source in these images matches the final checked-state fix committed with this record; documentation changes do not require a web rebuild.

### Final checks and remaining limits

After the fixes: **52 frontend tests**, TypeScript, **62 real PostgreSQL/backend tests** and executable packaging, web export/container builds and whitespace checks pass. No lint script exists. Fresh gated HTTPS/security smoke and private container/network checks pass after the final web update. An old synthetic fixture session had expired and returned the expected 401; re-authentication succeeded and exact notes/checklist completion/profile/preferences still matched. No service restart is claimed for this last expiry/re-authentication check. Synthetic browser fixtures and the pre-existing synthetic fixture remained separate; personal notes were not inspected or altered.

The nine browser scenarios are now genuinely Passed. **B01–B16, R01–R03 and A01–A04 remain Not Tested as full manual procedures.** Automated widths/ARIA assertions do not certify visual layout, a physical mobile keyboard, 200% zoom, VoiceOver/NVDA, complete focus order/trapping or rendered contrast on arbitrary photos. No Safari/Firefox/native-device or OS-reboot certification is claimed. The macOS in-app browser still lacks CA trust by design; the resolved execution path is the isolated Linux runner. Short-lived certificate renewal, approved tester access, current image scans and the existing session/offline/rollback limits remain release gates.

Recommendation: **safe to merge the focused PR into integration after normal human review**, based on the passing browser/backend/frontend checks and reviewed security scope. Do not interpret merge readiness as public release approval. No merge or public deployment was performed.

Additional follow-up files: `src/app/account.tsx`, `src/app/file/[id].tsx`, `src/app/search.tsx`, `src/components/AppearanceSheet.tsx`, `BottomNavigation.tsx`, `ChecklistEditorRows.tsx`, `EditProfileSheet.tsx` (component filenames under `src/components/`), and updated regressions in `e2e/workspaces.spec.ts`; evidence/instructions are in this guide, TESTING.md and LOCAL-HTTPS.md.

## Bug report form and exit gates

Copy this form privately for each finding: tested commit/image, date, tester pseudonym, browser/version/OS, viewport/zoom, mode/theme/accent, checklist ID, reproducible steps, expected result, actual result, severity, redacted synthetic evidence, retest result. Do not include secrets or real notes. A screenshot/trace review is required before sharing; traces can contain credentials.

Before starting a controlled beta: verify the approved isolated trust proof for the selected artifact; complete all applicable manual matrix rows; retain a passing run of all nine browser scenarios; review accessibility/responsive failures; confirm private access and current certificate/secrets/image scans; verify backup/restore instructions and preserve rollback artifacts. Any remaining nonblocking issue needs an owner and explicit acceptance. No public release is authorized by this document.


## Changed files in the complete PR

- Evidence/instructions: `BETA-TESTING.md`, `LOCAL-HTTPS.md`, `README.md`, `TESTING.md`.
- Browser regressions: `e2e/workspaces.spec.ts`.
- Screens/navigation: `src/app/_layout.tsx`, `src/app/you.tsx`, `src/app/account.tsx`, `src/app/file/[id].tsx`, `src/app/search.tsx`.
- Components (under `src/components/`): `AddPreview.tsx`, `AppearanceSheet.tsx`, `BottomNavigation.tsx`, `BubbleCard.tsx`, `ChecklistEditorRows.tsx`, `CollectionGrid.tsx`, `ConfirmDialog.tsx`, `EditContentSheet.tsx`, `EditProfileSheet.tsx`, `FileCard.tsx`, `ManagementMenu.tsx`, `MotionAwareModal.tsx`, `PinnedMarker.tsx`.
- Theme/motion: `src/theme/Theme.tsx`, `src/theme/appearance.ts`, `src/theme/motion.ts`.
- Module regressions: `tests/appearance.test.mjs`, `tests/motion.test.mjs`.

No dependencies, storage keys, content models, account APIs or database schema changed. Earlier PR changes add keyboard card options, preference-aware modal/route motion and contrast corrections; the verified follow-up fixes checked/current/toggle browser semantics and profile-test synchronization. Existing personal browser tabs/storage were untouched.


## Hosted release-readiness verification

[CI run 38974495598](https://github.com/hindkhial/bubble/actions/runs/38974495598) at source head `2eeee6c5b8e4a793016fd433ff5e209c4b0d7593` passed all nine scenarios, 53 frontend tests and 62 PostgreSQL/backend tests. Non-root sandboxed Chromium used fingerprint-verified temporary NSS trust on an ephemeral Linux runner; TLS rejection was verified before import and after removal. No macOS keychain was changed. Backup/restore compared seven tables exactly, verified recovered-backend operation and retained content after restart/reauthentication, then removed the disposable CI stack.

This does not change the manual matrix statuses: screen readers, complete focus management, mobile/tablet/desktop visual review, browser/text zoom and physical iOS/Android execution remain **Not Tested**. Two unresolved high dependency advisories and final candidate image scanning remain release blockers/gates in RELEASE-SECURITY.md and RELEASE-CHECKLIST.md. No release or public deployment is approved by CI success.


## Candidate security/QA follow-up

RELEASE-CANDIDATE-QA.md contains the current installed-version/exposure review, candidate image evidence and a device/tool-specific human checklist. All six required manual categories remain **Not Tested**: the actual in-app staging browser was blocked by ERR_CERT_AUTHORITY_INVALID and no host trust was altered. Physical devices and screen-reader control are unavailable here. Narrow automated keyboard/viewport assertions remain separate from full human QA. Two high dependency advisories remain blockers, along with the documented moderate findings; no audit suppression or incompatible transitive upgrade was used.

Actual candidate follow-up: [hosted run 38977872733](https://github.com/hindkhial/bubble/actions/runs/38977872733) at `c64dad27d039e9271c4aa036971dd4140fa0b911` passed all automated jobs, including the nine scenarios and new rollback/image gates. This leaves all manual categories above Not Tested.

Decoder remediation follow-up: fixed 0.5.0 with CommonJS packaging-only compatibility is locally verified with 55 frontend tests and web/iOS/Android exports. Audit now has two high and one moderate findings; no exclusions. Updated frontend runtime scan is clean. The earlier hosted 53-test result is a pre-decoder baseline; the new head requires its own complete CI run. Physical-device/manual matrix outcomes remain Not Tested.

## Detailed human verification

Use [MANUAL-QA.md](MANUAL-QA.md) for platform-specific screen-reader, keyboard/focus, layout, zoom, text-scaling and physical-device steps. All unexecuted checks remain **Not Tested**. [DEPENDENCY-RISKS.md](DEPENDENCY-RISKS.md) records the unresolved advisories; the two High findings remain release blockers. LOCAL-HTTPS.md specifies proposed profile-only trust and removal controls, with no Mac keychain changes.
