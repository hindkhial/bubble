# iPhone Simulator validation and polish

## Scope and evidence

Branch ios-simulator-polish continues verified device-preparation commit 39643618d247966a969306a9073f1c315bce01ca, itself based on PR #9's ios-native-foundation head 6118f0eccd315fb2377ec58c072c51c396efea2f. PR #8 and #9 remain unmerged. Physical testing was explicitly deferred by the owner because the phone could not connect; it remains Not Tested, never approved-as-passed.

Xcode 26.6 (17F113), iOS 26.5 runtime and workspace Ruby 3.4.8/CocoaPods 1.17.0 are available. The generated CocoaPods workspace contains 110 installed pods. Earlier owner-operated Xcode builds have three inspected successful activity logs with 122 targets. The installed Simulator artifact is com.hindkhial.bubble 0.1.0/build 1, minimum iOS 16.4. Screenshots identify iPhone 17 Pro; its Simulator device.plist identifies runtime com.apple.CoreSimulator.SimRuntime.iOS-26-5. No native project regeneration, signing change or reinstall/reset was performed for this polish.

Owner screenshots and responses confirm development-client launch and Home. Owner-executed creation/restart testing confirmed a synthetic note, checklist and completed-item state survived stopping/relaunching. These baseline passes are actual native/manual evidence. They do not establish that every changed interaction below passed.

## Confirmed code issues addressed

- Add's Cancel, backdrop and modal close previously reset incomplete creation fields immediately. A shared draft policy now protects text, images, color, checklist structure/completion and staged destination Bubbles. Keep editing retains the form; only explicit discard resets it. Removal/navigation is guarded, and closing is blocked during an in-flight save.
- Edit/profile sheets retained an old blocked navigation action after Keep editing. Clearing it prevents a later local discard from unexpectedly replaying that earlier navigation.
- The old beforeRemove prevention did not use native-stack's supported prevention mechanism. Add/edit/profile now use usePreventRemove from Expo Router's existing public react-navigation entry point, without another navigation package or version upgrade. Native gesture behavior still needs execution.
- iOS form/search scrolling supports interactive keyboard dismissal. Showing discard confirmation dismisses the keyboard and hides underlying form controls from accessibility navigation; the confirmation is exposed as the active modal. Complete VoiceOver focus/restore behavior remains a manual gate.
- Checklist controls expose explicit checked state and an item-index/text label. Appearance describes device-local storage on native instead of browser storage. Layout, colors, navigation entries and data formats are preserved.

The draft policy has four unit cases; the existing first browser scenario exercises Cancel → Keep editing → retained text → explicit discard → unchanged saved content → clean reopened form. The checklist browser assertion uses the more descriptive accessible name. No dependency, schema, backend or native account changes were introduced.

## Current execution record

| Check | Result and limits |
| --- | --- |
| TypeScript / frontend suite | Passed locally: 72 tests, zero failures/skips |
| Storage/photo/motion subset | Passed locally: 15 tests, included in the 72; disposable Node SQLite/adapter/photo-operation tests, not native UI/bridge execution |
| iOS Hermes/assets export | Passed locally; not native compilation |
| Production web regression export | Passed locally; no public web release |
| Current native Debug build attempt | Blocked/failed before compilation, exit 66: CoreSimulator XPC/temp/file-type restrictions; workspace recognition error |
| Baseline Simulator compile/install/launch | Passed previously, with Xcode logs and owner-observed execution as described above |
| Baseline note/checklist creation and checked-state restart persistence | Passed in owner-executed Simulator session |
| Updated native compilation, launch and interface checks | Not Tested successfully yet; owner Xcode/Simulator execution requested |
| Current browser interaction regression | Pending hosted execution at this record; consult exact PR head checks |
| Backend local rerun | Not run: backend behavior unchanged; hosted CI is separate evidence |
| Physical iPhone / phone reboot / TestFlight | Not Tested / not attempted; owner-deferred and separately gated |

The session still cannot connect to CoreSimulator, enumerate/boot/install/launch devices or complete xcodebuild. Prior successful builds are not transferred to the new head. A fresh native build was attempted instead of using export success as a substitute. No new native crash/data-loss clearance is claimed while interface checks are unexecuted.

## Focused owner-operated Simulator session

Use iPhone 17 Pro under **iOS Simulators** in Xcode, not a physical phone. No cable, Apple sign-in, development team or Developer Mode change is needed for Simulator. Open ios/Bubble.xcworkspace, choose Bubble and Product → Build/Run. Do not open only Bubble.xcodeproj. Keep existing app data; do not uninstall or erase the Simulator.

The refreshed development server is localhost-only on port 8083 with IPv4-first DNS. Enter http://127.0.0.1:8083 in the development client if necessary. Successful bundle HTTP 200 establishes server reachability, not Home/UI success. A Debug development client still needs Metro to cold-start its JavaScript; it is not evidence of standalone offline launch.

| Execute with synthetic data; record Passed, Failed or Not Tested | Status |
| --- | --- |
| Fresh build/run, confirm Home and Home/Search/Add/You navigation | Not Tested on changed head |
| Add note: type body, Cancel/backdrop, Keep editing; verify exact draft retained; explicitly discard; reopen clean | Not Tested |
| Add checklist: type multiple items, move through destination selection, test discard protection, save and reopen | Not Tested |
| Edit note/checklist: long text/items, scroll with keyboard, reach Save/Cancel in one tap | Not Tested |
| Edit/profile: attempt back navigation, Keep editing, then Cancel/discard; verify no stale navigation occurs | Not Tested |
| Profile: change synthetic name/bio/avatar; Save, terminate/relaunch and verify exact values | Not Tested |
| Photo: choose synthetic image, save/relaunch, replace/relaunch, remove/relaunch; cancellation/denied permission retain old value | Not Tested |
| Appearance: Light/Dark/System, change Simulator appearance, change every accent; restart and verify preferences | Not Tested |
| Search: title/body/checklist text, filters, clear, no results; open and edit selected content | Not Tested |
| Repeat note/checklist creation, completion and full process-restart persistence on changed head | Not Tested |
| Top notch/bottom home-indicator safe areas, modal scrolling, keyboard dismissal, back gestures | Not Tested |
| VoiceOver labels/checked announcements, modal focus isolation and focus restoration after closing | Not Tested |
| Dynamic Type largest accessibility sizes, readable wrapping, reachable buttons; Reduce Motion respected | Not Tested |
| Light/dark visual contrast and touch targets across all listed screens | Not Tested |
| No-backend local editing/data preservation | Not Tested on changed head in native UI |
| Bundled Simulator build cold-start with Metro/internet unavailable | Not Tested |

For restart checks, use the same installed app: terminate it, relaunch, reconnect Metro if using Debug, then compare exact note text, row ordering/checked state, profile/photo and appearance. Report a failed save/crash before proceeding; never “repair” test failures by deleting user storage. Corrupt/newer-schema/migration-failure tests use disposable databases in the automated suite, not the owner's existing Simulator database.

## Offline and security boundaries

Native accounts remain disabled. Local mode does not require a configured API. No backend request, TLS bypass, CA trust change, credential embedding, schema reset, LAN binding, tunnel or cloud service was introduced. Saved-data adapters and photo ownership/commit semantics are unchanged. Existing dependency security and human accessibility/release gates remain open. This work does not authorize merges, public deployment, TestFlight or physical installation.

## Completion gate

The polish is implemented and automated verification is in progress; it is not complete native validation until the changed head compiles/launches and core keyboard/navigation/restart checks pass in Simulator. Deferred/unexecuted checks above are not waived or reported as passed.


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
