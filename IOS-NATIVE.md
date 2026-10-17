# iPhone native foundation

Bubble's release target is iPhone → private TestFlight → App Store. Android is deferred; browser support is a development/regression surface, not a public release target. This implementation is **not fully native-validated** until Simulator compilation and launch succeed.

## Baseline and identity

`ios-native-foundation` starts from verified `release-readiness` commit a88daebf8defaff8ccad39a8fab84f2cdc5918bd, which contains unmerged PR #8 fixes. `integration` remains af922352531da0669d8de60a29b75ec862cd0e17. Neither PR nor existing branches are merged/rewritten. A PR targeting integration therefore includes the unmerged baseline work; review the foundation commit separately and resolve that dependency explicitly before merging.

The owner approved **com.hindkhial.bubble for local development/Simulator only**. It has not been checked for availability with the owner's Apple team or registered. App display name Bubble, version 0.1.0, development build number 1, iPhone-only family, portrait orientation, iOS deployment target 16.4. App Store/TestFlight signing, availability verification and distribution require separate approval. No credentials or Apple team secrets are in configuration.

Expo 57 remains the framework. Expo, Router and Metro runtime received compatible SDK 57 patch updates after `expo install --check` flagged their prior versions; no framework-major upgrade or arbitrary transitive override was added. SQLite, FileSystem, Crypto, SystemUI, BuildProperties and DevClient are SDK-compatible native modules. `app.config.ts` permits an explicit valid bundle-identifier override, but does not register anything. `eas.json` contains optional development-only Simulator/device profiles, with no submit profile or automatic upload. No EAS account/project or cloud build was created.

## Storage and images

Metro selects `src/storage/local.native.ts` on iOS: an app-private Expo SQLite `bubble.db`, WAL, FULL synchronous writes, a transactional version-1 schema and parameter-bound reads/upserts. Existing versioned JSON keys/models are retained in database-backed records, rather than introducing a normalized schema and changing all repositories in the same step. Each record replacement is atomic; multi-record actions are not promised to be one cross-record transaction. This is a foundation for later normalized queries/async large-library access, not a full-text SQL index.

Browser builds select the existing localStorage adapter. There is no automatic transfer of personal browser data into native storage. Hydration validates saved records; malformed data, failed database opens, newer schemas or failed migrations never trigger reset/delete/default writes. Synchronous commits occur before UI save confirmation. Failed saves retain the last committed model and show an error; note/list/profile editors retain their drafts. No database reset or personal-data migration was run. Credential/session keys are refused by the native adapter. Native accounts remain disabled, so no authentication secret needs a new storage mechanism; if credentials become necessary, use an explicitly reviewed Keychain-backed store, never ordinary app-state records.

Profile images are copied from the picker into Documents/profile-photos before committing the profile. Stored `bubble-photo:` references contain only managed filenames, so app-container path changes do not bake stale absolute paths into new saved profiles. Rendering resolves them against the current Documents directory. Replacement/removal deletes the old managed file only after successful profile commit; failed commits remove the new copy where possible. Only files owned by this naming scheme are eligible for deletion. No external/source photo is deleted. Cleanup is best effort: a crash between copy/commit or a failed delete may leave an unreferenced file; no broad directory sweep risks deleting still-referenced files. Missing saved images fall back to the avatar and display an error. Picker metadata and source file size are validated, with a 10 MB limit; denied permissions/cancel/error paths keep existing images. Actual iOS permission dialogs/file behavior still require device verification. This step hardens profile images only; native photo-note/cover cache-URI durability remains a separate follow-up and must not be claimed solved.

## Native account readiness

The Spring Boot API uses Secure/HttpOnly session cookies, session-ID rotation and CSRF tokens. Nothing in the backend or these protections changed. Native sign-in/resume remain explicitly disabled pending verification of iOS cookie persistence, CSRF refresh, expiry and logout. The native API parser requires an explicit HTTPS URL (or no URL for local-only use); it has no HTTP localhost fallback and accepts no embedded credentials/query secrets. EXPO_PUBLIC variables are compiled into the app and must never contain passwords, gate credentials or tokens.

A physical phone's localhost is the phone. Current Mac staging is loopback-only and cannot be reached directly from it. A private reachable route, matching hostname and trusted certificate require a separate approved setup. Do not expose staging, copy private CA keys, disable TLS verification, embed the tester gate password, or weaken CSRF/CORS to make native requests work. Native networking is not subject to browser CORS enforcement, but the existing backend browser security configuration remains intact. Test a reviewed native transport against the existing API before enabling the account UI. Decide explicitly whether account mode remains online-only or needs an offline cache/sync design; current browser behavior is not proof of native offline account support.

## Native UI preparation

Existing navigation and visual identity are preserved. Add/edit/profile/Appearance sheets now include home-indicator inset padding; avatar swatches wrap on small widths, navigation icons can grow with text scaling, and Appearance radio controls expose native checked states. Local System appearance is supported alongside Light/Dark; SystemUI and automatic native interface configuration avoid forcing iOS into light mode. Existing keyboard avoidance, reduced-motion observation and native modals remain. A confirmed browser regression from the initial detail guard was fixed: recoverable storage/API errors must not unmount an existing editor and discard its draft; only initial hydration/missing-content failures block the detail view. VoiceOver focus, swipe-back/discard behavior, Dynamic Type, small-screen keyboards and physical touch usability remain **Not Tested**, not inferred from browser checks.

## Environment and exact next steps

Audit: macOS 26.7.1; Xcode **26.6 (17F113)** selected at `/Applications/Xcode.app/Contents/Developer`. Compatible with Expo 57 (Xcode 26.4+, iOS 16.4+). System Ruby remains 2.6.10. Following owner approval, workspace-only Ruby 3.4.8, Bundler 2.6.9 and CocoaPods 1.17.0 are installed and verified. `.ruby-version`, `Gemfile` and `Gemfile.lock` pin the tooling; machine-local installation files/configuration are ignored. No system software, global Ruby, shell profiles or macOS trust/security settings were changed.

1. In Xcode, finish any first-launch component/license setup yourself and install an iOS Simulator runtime through Settings → Components/Platforms (labels vary). Do not erase any existing Simulator with personal test data. In an unrestricted Terminal run `xcodebuild -version` and `xcrun simctl list devices available`.
2. Use Ruby 3.4.8 from an approved separate installation, then Bundler 2.6.9 and `bundle install`; verify `bundle check` and `bundle exec pod --version` (1.17.0). Do not replace Apple's system Ruby or install global gems with sudo. On the current Mac only, `source ../work/ios-tools/env.sh` prepares the approved workspace tools; invoke `../work/ios-tools/ruby/bin/ruby ../work/ios-tools/ruby/bin/bundle` in place of `bundle`. This machine-local environment file is not portable or committed. CocoaPods documents using separate maintained Ruby: https://guides.cocoapods.org/using/getting-started.html.
3. From this branch, use the pinned package manager: `pnpm install --frozen-lockfile`, `pnpm exec expo install --check`, `pnpm typecheck`, `pnpm test`. Keep personal browser profiles and databases untouched.
4. Run `pnpm prepare:ios`. This uses Expo CNG/prebuild for iOS with `--no-install`; it does not install CocoaPods or register Apple identifiers. Generated ios/ is ignored and must not be treated as the configuration source. Do not use `--clean` against hand-edited native work. Then run `bundle exec pod install --project-directory=ios` in the approved native tool environment. CocoaPods now successfully installed 110 pods and generated Bubble.xcworkspace on the current Mac; no regeneration/clean was needed for this follow-up.
5. Run `pnpm ios` and choose an installed iPhone Simulator. Alternatively open `ios/Bubble.xcworkspace` after pod installation and select an iPhone Simulator. Simulator builds need no Apple distribution signing; never enable automatic Apple registration as part of this step. Keep Metro running for a development-client build. No TestFlight or EAS submission commands are authorized.
6. Seed synthetic notes/checklists/profile/photo/theme; terminate and relaunch the app (do not uninstall/reset it) and confirm all data survives. Edit/check/pin, relaunch again, then replace/remove the profile photo. Test denied/limited photo access, low-space/save failure, malformed database recovery refusal, airplane mode/local-only, keyboard, safe areas, VoiceOver and Dynamic Type. Record each actual result with source SHA and Simulator model/runtime. A JavaScript export or Node SQLite test is not an app restart test.
7. Physical iPhone and signing/team access are later approved steps. Pairing/Developer Mode, development signing and private HTTPS connectivity must be reviewed before use. TestFlight distribution is outside this foundation task.

The automated `simctl` probe still fails with CoreSimulatorService connection/log-access errors. The host runtime image registry is empty; a usable runtime has not been verified. Runtime download is owner-approved, but Simulator/cache filesystem access was not granted by automatic approval review. Install a compatible runtime through Xcode Settings → Components and confirm `xcrun simctl list devices available` in the owner’s Terminal. Do not erase existing devices or change security settings.

After successful pod installation, two unsigned Debug Simulator workspace build attempts exited 66 before application compilation. Relative and absolute workspace paths both produced “is not a workspace file”, alongside denied temporary-result writes, unavailable Simulator services and file-type-detection warnings. The generated workspace XML references both existing projects; Xcodeproj successfully parses the workspace, app project (1 target) and Pods project (121 targets). That structural check does not prove Xcode can build it. Open ios/Bubble.xcworkspace in unrestricted Xcode and investigate any remaining recognition error there; its root cause is not yet established. No application compile error or successful native build is claimed.

React Native initially failed saving a checksum-verified archive to its fixed user cache. Its supported `RCT_SKIP_CACHES=1` option allowed project-local downloads without modifying third-party source or user caches. All six React Native/Hermes Debug/Release archives were separately verified against their published Maven SHA-1 values over verified HTTPS; local SHA-256 values were recorded in the execution output. CocoaPods script phases were inspected: normal generated configuration/header, framework selection, dSYM and codegen operations; no project-specific credential injection was added. Standard installations with writable caches do not need this option.

## Verification stages

| Stage | Result |
| --- | --- |
| TypeScript and frontend/storage/photo regression tests | Passed locally; see TESTING.md and exact PR CI |
| Expo public config and SDK dependency compatibility | Passed locally |
| Expo iOS project generation with approved local identity | Passed locally, no pod installation/signing |
| iOS JavaScript/Hermes/assets export | Passed locally; not native compilation |
| Ruby/Bundler/CocoaPods and native dependency installation | Passed: Ruby 3.4.8, Bundler 2.6.9, CocoaPods 1.17.0; 110 pods, workspace generated |
| Native Simulator compilation | Failed before compilation: workspace recognition and restricted Simulator/temp services; exit 66 |
| Simulator app launch and real native restart persistence | Not Tested |
| Physical iPhone installation, photos, VoiceOver and Dynamic Type | Not Tested |
| Native account cookie/session/TLS behavior | Not Tested; account mode remains disabled |
| TestFlight/distribution | Not attempted or approved |

Existing High node-forge/braces and Moderate uuid findings remain tracked, without suppression. The SDK patch alignment does not resolve them. Existing required human/security release gates stay open. Browser CI is regression coverage only; it does not approve an iPhone candidate. See MANUAL-QA.md for the full human matrix.

## Simulator execution record (2026-10-17)

Source baseline: 8194f4249d1ab7ae976578d36684b9a5f90363cc; this follow-up changes tool locks/ignore rules/documentation only. No native UI or data-model changes were made.

| Scenario | Result |
| --- | --- |
| Install/launch app and open Home | Not Tested — no compiled app |
| Create/edit notes and pin/search content | Not Tested |
| Create/complete checklists | Not Tested |
| Terminate/relaunch and verify native SQLite records | Not Tested |
| Edit profile; save/replace/remove photo; relaunch | Not Tested |
| Appearance, accents, System/Light/Dark persistence | Not Tested |
| Navigation, keyboard overlap and iPhone safe areas | Not Tested |
| Offline local-only workflow and restart | Not Tested |

Use synthetic data and the same installed app for restart testing; never uninstall/erase it to test persistence. Save a distinctive note and checklist, check one item, set profile/photo/theme, terminate via `xcrun simctl terminate booted com.hindkhial.bubble`, relaunch via `xcrun simctl launch booted com.hindkhial.bubble`, then verify exact saved values and files. A Debug development client also needs Metro (`pnpm start --dev-client`) and a one-time connection to its development server. Keep Metro reachable when testing local-only API independence; use a separately reviewed bundled build for a true cold start with every network connection disabled. Native accounts remain disabled.

Next host step: finish the approved runtime installation in Xcode, confirm Simulator works, open the generated workspace and build Bubble for an installed iPhone Simulator. No TestFlight, signing/team registration, keychain changes or public deployment are authorized. The Simulator milestone remains incomplete until compilation, launch, core workflows and native restart persistence actually pass.
