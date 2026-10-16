# Private beta testing

## Scope and current decision

Reviewed on 2026-10-16. PR #6 had no blocking source/configuration findings after reviewing all 20 changed files and rerunning the frontend/backend/build and HTTPS/account checks. GitHub reported no checks or statuses. It merged into `integration` at `1ed5bb0beac7f737c57175242c26500676169b6d`. `beta-testing` starts from that merge. Original `frontend` and `backend` branches are preserved.

**Not ready to invite testers yet:** the actual staging UI could not load in the available real browser. Opening `https://localhost:8443` in the in-app browser failed with `net::ERR_CERT_AUTHORITY_INVALID`, before the tester login or Bubble UI. This is a failed browser-access prerequisite, not an application assertion failure. No certificate warning was bypassed or trust installed. The prior Chromium Mach-port launch restriction remains documented in [TESTING.md](TESTING.md). There is no unrestricted browser runner here; the headless suite was not rerun under the same restriction.

All interface checks below are **Not Tested** in this review. Previous walkthrough evidence in TESTING.md is historical, not execution of this beta matrix. Unit tests, static review and live API checks do not certify browser behavior. No public deployment, remote infrastructure or tester invitations were performed.

## Safe tester setup and process

1. A coordinator uses the existing loopback-only setup in [STAGING.md](STAGING.md). Keep HTTPS, the tester gate, CSRF, secure cookies and private database network enabled. Do not publish ports, create a tunnel, forward the port, or share the database. Testers currently need access to this host or their own separately configured local stack; remote beta access needs a separately approved private-access plan.
2. Use an isolated browser profile, an empty dedicated workspace and synthetic accounts/content. Never clear an existing personal profile or import a real user's notes. Record any existing synthetic fixture's text, checklist order/completion, profile and preferences before testing it.
3. A trusted operator verifies the local certificate fingerprint/hostname/expiry and configures trust for only the public test CA certificate in the isolated test environment under their security policy. Do not bypass warnings, disable verification, install/share the CA private key, or add broad trust automatically. CLI `NODE_EXTRA_CA_CERTS` does not configure the browser. Renew the seven-day certificate before expiry using a coordinated replacement; preserve database passwords/volumes.
4. Give authorized testers separate bcrypt gate entries and deliver credentials privately. Keep Bubble account credentials separate. Never paste credentials, cookies, traces, real content or personal data into GitHub/chat. Gate credentials can remain cached after Bubble logout: close the isolated profile at the end and verify revocation by removing the tester entry and recreating web as described in STAGING.md.
5. Record the tested commit and image IDs, date, browser/version, OS, viewport, workspace mode, theme/accent, steps, expected/actual result and **Passed / Failed / Not Tested** for each row. A Passed result requires observed execution. Attach only redacted synthetic screenshots; raw traces stay private outside Git. Build a new web image for this branch before validating its UI fixes; the running stack still serves the reviewed PR #6 images.
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

## Executed checks and source findings

- **Passed:** 52 frontend tests, including local persistence/validation, profile/appearance, search/ordering, API errors, explicit-copy isolation and four reduced-motion observer cases. These are module tests, not browser storage/interaction proof.
- **Passed:** 62 real PostgreSQL/backend tests, zero failures/errors/skips; Maven executable packaging. Includes ownership, authentication/CSRF, migrations/data preservation, settings and atomic checklist behavior.
- **Passed:** TypeScript, Expo web export, whitespace checks. No lint script exists. The first export hit the environment's unwritable default Expo directory; configuring a writable tool-state directory resolved it without a source change.
- **Passed:** live HTTPS gate/cookie/CSRF/CORS/route checks and real TypeScript client → Spring → PostgreSQL registration/login/logout/session, notes/checklists/search/pinning, profile/preferences and explicit-copy/local-original checks. Synthetic persistent fixture values were also compared exactly through the existing lifecycle helper. These ran against the unchanged staging images; beta UI changes are validated by types/build/module tests only.
- **Passed:** running container health/non-root/read-only secrets, restricted database role, loopback-only publishing and rejection on the host's non-loopback address. PostgreSQL/backend have no host ports. This is configuration/own-host evidence, not an external Internet probe.
- **Failed prerequisite:** real in-app browser navigation to staging stopped at certificate authority validation. No Bubble screen was rendered; all UI matrix rows remain Not Tested.
- **Not Tested:** the nine-scenario Playwright suite (the original eight plus one new keyboard/responsive scenario). Discovery/type checking passes; no unrestricted Chromium runner is available. Do not mark the original eight or the new scenario passed.

Confirmed source defects fixed on this branch:

1. Unpinned cards offered actions only through long-press/context menus, leaving keyboard users without a normal control for pinning. Every card now has a labeled, focusable options button; pinned cards retain their pin symbol. A new browser regression checks Enter/Space pinning at three widths but awaits execution.
2. All eight sheet/dialog sites used unconditional slide/fade transitions. A shared modal honors the device/browser reduced-motion preference; route animations also disable when requested. A single provider subscription defaults conservatively to no motion, handles preference changes and ignores stale asynchronous results after changes/unmount. Observer tests cover those cases and query failure. Full rendered motion behavior awaits browser testing.
3. Error/delete text used the same dark red on dark surfaces (approximately 2.33:1 on the dark sheet), and muted small captions on colored light cards ranged about 2.41–4.30:1. A theme-aware destructive color and normal text color on colored captions improve contrast. Tests enforce at least 4.5:1 for destructive/muted text on neutral form surfaces and existing text/action combinations for all seven accents in both modes. This does not certify text over arbitrary photographs or all rendered states.

Source review also found labeled form inputs, semantic checklist/radio state and search announcements, flexible two-column grids, scrollable editors and bounded dialogs. Those patterns are retained. Actual focus visibility/trapping, screen-reader announcements, modal behavior, zoom, mobile keyboard, grid wrapping and visual spacing remain unverified. No responsive layout defect is claimed fixed without rendered evidence. A 36-pixel options target is retained within the existing geometry; tester review should check touch comfort.

No storage keys, content models, account APIs, database schema or existing user fixtures were changed. No dependencies were added. The synthetic preservation check does not certify a real user's uninspected browser data. Existing personal browser tabs/storage were left untouched.

## Bug report form and exit gates

Copy this form privately for each finding: tested commit/image, date, tester pseudonym, browser/version/OS, viewport/zoom, mode/theme/accent, checklist ID, reproducible steps, expected result, actual result, severity, redacted synthetic evidence, retest result. Do not include secrets or real notes. A screenshot/trace review is required before sharing; traces can contain credentials.

Before starting a controlled beta: resolve certificate trust on an approved isolated browser; build the reviewed beta web artifact; complete all applicable matrix rows; run all nine browser scenarios on an unrestricted runner; review accessibility/responsive failures; confirm private access and current certificate/secrets/image scans; verify backup/restore instructions and preserve rollback artifacts. Any remaining nonblocking issue needs an owner and explicit acceptance. No public release is authorized by this document.

## Changed files

- Process/docs: `BETA-TESTING.md`, `README.md`, `TESTING.md`.
- Browser regression: `e2e/workspaces.spec.ts`.
- Route/profile modal integration: `src/app/_layout.tsx`, `src/app/you.tsx`.
- Shared motion/preferences: `src/components/MotionAwareModal.tsx`, `src/theme/motion.ts`, `src/theme/Theme.tsx`.
- Modal callers: `src/components/AddPreview.tsx`, `AppearanceSheet.tsx`, `CollectionGrid.tsx`, `ConfirmDialog.tsx`, `EditContentSheet.tsx`, `EditProfileSheet.tsx`, `ManagementMenu.tsx` (all under `src/components/`).
- Card options/contrast: `src/components/BubbleCard.tsx`, `FileCard.tsx`, `PinnedMarker.tsx`, `ChecklistEditorRows.tsx` (all under `src/components/`), `src/theme/appearance.ts`.
- Module regressions: `tests/appearance.test.mjs`, `tests/motion.test.mjs`.
