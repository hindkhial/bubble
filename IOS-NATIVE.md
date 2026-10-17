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

Existing navigation and visual identity are preserved. Add/edit/profile/Appearance sheets now include home-indicator inset padding; avatar swatches wrap on small widths, navigation icons can grow with text scaling, and Appearance radio controls expose native checked states. Local System appearance is supported alongside Light/Dark; SystemUI and automatic native interface configuration avoid forcing iOS into light mode. Existing keyboard avoidance, reduced-motion observation and native modals remain. VoiceOver focus, swipe-back/discard behavior, Dynamic Type, small-screen keyboards and physical touch usability remain **Not Tested**, not inferred from browser checks.

## Environment and exact next steps

Audit: macOS 26.7.1; Xcode **26.6 (17F113)** selected at `/Applications/Xcode.app/Contents/Developer`. Compatible with Expo 57 (Xcode 26.4+, iOS 16.4+). System Ruby 2.6.10; `pod` was not found on PATH. No system software, global Ruby or macOS trust/security settings were changed.

1. In Xcode, finish any first-launch component/license setup yourself and install an iOS Simulator runtime through Settings → Components/Platforms (labels vary). Do not erase any existing Simulator with personal test data. In an unrestricted Terminal run `xcodebuild -version` and `xcrun simctl list devices available`.
2. After approving tool installation, install a maintained CocoaPods/Ruby environment; do not replace Apple's system Ruby. If Homebrew is already installed, `brew install cocoapods` is one supported route. Verify `pod --version`. If Homebrew is absent, approve/install the chosen tool manager first rather than running an unreviewed bootstrap command. CocoaPods documents a separate maintained Ruby and user-scoped installation alternative: https://guides.cocoapods.org/using/getting-started.html.
3. From this branch, use the pinned package manager: `pnpm install --frozen-lockfile`, `pnpm exec expo install --check`, `pnpm typecheck`, `pnpm test`. Keep personal browser profiles and databases untouched.
4. Run `pnpm prepare:ios`. This uses Expo CNG/prebuild for iOS with `--no-install`; it does not install CocoaPods or register Apple identifiers. Generated ios/ is ignored and must not be treated as the configuration source. Do not use `--clean` against hand-edited native work. Then `cd ios && pod install && cd ..` in the approved native tool environment.
5. Run `pnpm ios` and choose an installed iPhone Simulator. Alternatively open `ios/Bubble.xcworkspace` after pod installation and select an iPhone Simulator. Simulator builds need no Apple distribution signing; never enable automatic Apple registration as part of this step. Keep Metro running for a development-client build. No TestFlight or EAS submission commands are authorized.
6. Seed synthetic notes/checklists/profile/photo/theme; terminate and relaunch the app (do not uninstall/reset it) and confirm all data survives. Edit/check/pin, relaunch again, then replace/remove the profile photo. Test denied/limited photo access, low-space/save failure, malformed database recovery refusal, airplane mode/local-only, keyboard, safe areas, VoiceOver and Dynamic Type. Record each actual result with source SHA and Simulator model/runtime. A JavaScript export or Node SQLite test is not an app restart test.
7. Physical iPhone and signing/team access are later approved steps. Pairing/Developer Mode, development signing and private HTTPS connectivity must be reviewed before use. TestFlight distribution is outside this foundation task.

The agent's `simctl` probe failed with CoreSimulatorService connection/log-access errors. An unsigned `xcodebuild` Simulator attempt failed during build preparation with restricted DerivedData writes and CoreSimulator errors; it did not compile application sources. CocoaPods/workspace setup is also pending. These are recorded infrastructure/setup blockers, not a successful compile or a diagnosed app-code build error. Run the steps above in an unrestricted local environment before judging native compilation.

## Verification stages

| Stage | Result |
| --- | --- |
| TypeScript and frontend/storage/photo regression tests | Passed locally; see TESTING.md and exact PR CI |
| Expo public config and SDK dependency compatibility | Passed locally |
| Expo iOS project generation with approved local identity | Passed locally, no pod installation/signing |
| iOS JavaScript/Hermes/assets export | Passed locally; not native compilation |
| Native Simulator compilation | Blocked/failed during environment build preparation |
| Simulator app launch and real native restart persistence | Not Tested |
| Physical iPhone installation, photos, VoiceOver and Dynamic Type | Not Tested |
| Native account cookie/session/TLS behavior | Not Tested; account mode remains disabled |
| TestFlight/distribution | Not attempted or approved |

Existing High node-forge/braces and Moderate uuid findings remain tracked, without suppression. The SDK patch alignment does not resolve them. Existing required human/security release gates stay open. Browser CI is regression coverage only; it does not approve an iPhone candidate. See MANUAL-QA.md for the full human matrix.
