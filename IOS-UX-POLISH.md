# iOS UX and standalone verification

Baseline: integration `ed80addc932535caf3d841d108af7d5bf0111402`.
Branch: `ios-ux-polish`. Implementation is reviewable; native validation is pending.
This supplies the previously unimplemented iOS UX work, without claiming a physical-device pass.

## Focused changes

- Existing Add, Edit and Appearance sheets respect the top safe area as well as their existing bottom insets and keyboard avoidance.
- Long confirmation dialogs scroll within safe areas; both actions remain inside the scrollable content.
- Shared note/description inputs use minimum heights instead of fixed heights; action buttons have breathing room for scaled text. The remove-photo target is at least 44 points.
- Bottom navigation labels remain scalable and tabs share available width. Decorative glyphs keep their icon size and do not become separate VoiceOver elements.
- Appearance modes wrap at narrow widths; radio controls expose disabled as well as selected states.
- iOS explicitly announces authentication, password-change and profile error feedback; Android/web retain their live-region behavior. Full VoiceOver interaction remains Not Tested.
- An explicit `EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1` build flag makes the existing private-tester access UI available in a Release test build. The prior `__DEV__` guard hid it in Release, preventing login to the gated backend. No credentials, cookies or secrets are embedded, and authentication/TLS/CSRF remain unchanged. Without the flag, Release builds still omit these invitation controls.

The two-bubble Welcome logo, mandatory authentication, You Log Out, Security Change Password, content/storage models and theme colors are preserved. Existing Reduced Motion and contrast tests remain in place. No new dependencies or backend changes.

## Current evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Frontend tests | Passed | 103 local tests, including two helper-command regressions using isolated fake tools (not native signing proof) |
| TypeScript | Passed | Local `tsc --noEmit` |
| Original unsigned Release compilation and embedded bundle | Passed | Owner reported build success; agent read the produced Release Info.plist and main.jsbundle |
| Original unsigned Release startup | Passed | Owner reported Login screen; authentication failed with generic connection feedback |
| Signed Release compilation | Blocked / Pending owner | Agent exits 66 before compilation due to session workspace/service restrictions; local ad hoc rebuild awaits owner |
| Post-login native layout and persistence after these changes | Not Tested | Owner execution required below |
| Metro stopped during standalone test | Not Tested | No launch test performed; existing development server was not stopped by the agent |
| Physical iPhone pairing/signing/install | Not Tested | Deferred until standalone Simulator verification passes; local signing settings untouched |
| VoiceOver, largest Dynamic Type, Reduced Motion and native visual review | Not Tested | Execute the matrix below; static checks are not a native usability pass |

Local logs/artifacts live outside Git in the task's `work` directory. Hosted results are recorded in the pull request at its exact head. Backend tests, browser checks and image scans are separate from native validation.

## Run on the Mac: build first

Use the existing generated workspace and installed Pods. Do not run a clean Expo prebuild, uninstall Bubble, erase Simulator, change project-wide/physical-device signing or import a certificate.

```sh
cd "/Users/macbookpro/Documents/Codex/2026-10-13/hey-can-you-please-access-to/Bubble"
git branch --show-current
sh scripts/build-ios-simulator-release.sh
```

The branch should be `ios-ux-polish`. The owner approved local ad hoc Simulator signing on October 20. The script uses command-only `CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= PROVISIONING_PROFILE= PROVISIONING_PROFILE_SPECIFIER=` with `-sdk iphonesimulator` and a generic Simulator destination. It does not edit project settings, use Apple signing certificates, register anything or modify macOS keychains. It checks both the embedded bundle and `Signature=adhoc` / `TeamIdentifier=not set`, then verifies the signature strictly, including nested code. It stops on a mismatch. It sets the existing HTTPS loopback backend and public tester-UI flag. Stop on a build error and report the first actual error. A successful JavaScript export is not a native build.

If Terminal is blocked but Xcode works, open `ios/Bubble.xcworkspace`, select Bubble and the existing **Bubble Auth Test** Simulator. Product → Scheme → Edit Scheme → Run → Info → Build Configuration → Release. Set `EXPO_PUBLIC_API_URL=https://localhost:8443` and `EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1` in the environment from which Xcode is launched for bundling (Run-only environment variables do not configure the build bundle). Prefer the Terminal script for reproducible build-time values; do not change signing to solve this.

## After a successful build: actual standalone test

1. Keep the existing private HTTPS backend running. Use the existing **Bubble Auth Test** Simulator with its previously approved CA; do not import trust into another Simulator or either macOS keychain. No certificate warning bypasses.
2. In every Terminal running Metro, press Control-C. Check `lsof -nP -iTCP -sTCP:LISTEN` for remaining Metro ports, including 8083, 8084 and 8085. Close only known Metro processes; do not stop Docker/backend services. Record whether Metro is fully stopped.
3. Run `xcrun simctl list devices booted` and identify the UUID of **Bubble Auth Test**, not a physical device or the original personal Simulator. If no test Simulator is booted, open it in Simulator first.
4. In Terminal, set `SIMULATOR_UUID` to that exact UUID, then run:

```sh
APP="$PWD/../work/ios-ux-release-adhoc/Build/Products/Release-iphonesimulator/Bubble.app"
test -s "$APP/main.jsbundle"
xcrun simctl terminate "$SIMULATOR_UUID" com.hindkhial.bubble
# A "not running" response is harmless; do not uninstall the existing application.
xcrun simctl install "$SIMULATOR_UUID" "$APP"
xcrun simctl launch "$SIMULATOR_UUID" com.hindkhial.bubble
```

Installing the same identifier updates the binary; still verify retained test data rather than assuming preservation. If any unexpected data loss occurs, stop without further writes/resets. The build script does not install automatically. Use the printed app path if `BUBBLE_SIMULATOR_BUILD_DIR` was customized.

5. Confirm Bubble opens without a development-server chooser. Before writing anything, verify existing synthetic notes/checklists, profile photo and Appearance. Enter tester credentials locally via Private beta access if required; use only synthetic account credentials. Registration/login and session restoration must succeed against trusted reachable HTTPS before recording an authentication pass.
6. Visit Home, Search, Add and You. Create/edit a synthetic note and checklist, complete an item, search/open it, change profile/photo and mode/accent. Confirm Cancel → Keep editing preserves drafts, long forms scroll with the keyboard up and Save/Cancel remain reachable. Test both confirmation actions.
7. Terminate and relaunch with the commands above (without reinstalling) and verify each saved value. Profile photo/emoji/accent use account-specific local storage; account notes/lists use the backend. Legacy SQLite content remains isolated; do not copy it unless deliberately selecting synthetic fixtures and confirming the account.
8. Separately disable internet/network access using an agreed method and record it. Current native account policy requires online verification and has **no offline account cache/edit queue/sync**. Expect unavailable/retry feedback, preserved drafts and no fallback into another account's or legacy data. A blocked account-mode screen is not a failed SQLite migration. Restore networking before continuing.

## Native UX result matrix

Record candidate SHA, Simulator model/runtime, tester, date and Passed/Failed/Not Tested for each row. All rows start **Not Tested**.

| Scenario | Status |
| --- | --- |
| Release launch with all Metro processes stopped | Not Tested |
| Welcome/logo/no Appearance; signup/login; logout on You; password change in Security | Not Tested |
| Home/Search/Add/You, back/gesture navigation, unsaved draft protection | Not Tested |
| Notes/checklists, completion, search and saved state after relaunch | Not Tested |
| Existing SQLite isolation and retained profile photos/Appearance | Not Tested |
| Keyboard up, scrolling, reachable actions, portrait/landscape safe areas | Not Tested |
| Largest accessibility text sizes; tabs, form controls and both dialog actions | Not Tested |
| VoiceOver labels, selected/disabled states, announcements, modal focus entry/return | Not Tested |
| Reduced Motion enabled and changed while running | Not Tested |
| Light/dark/system appearance and each accent visually reviewed | Not Tested |
| Backend unavailable/offline policy and recovery without data deletion | Not Tested |
| Physical iPhone 13 pairing, Developer Mode, signing and install | Not Tested |

## Release gates

Existing node-forge/braces High findings and uuid Moderate finding remain tracked in DEPENDENCY-RISKS.md. A green runtime scan does not clear build-tool findings. Manual accessibility, physical-iPhone and standalone checks stay open. No Apple identifier registration, project-wide/physical-device signing or provisioning changes, TestFlight/App Store submission, release tag, public deployment or automatic merge is authorized. The separately approved Simulator-only command overrides are described above. Phase 3 device preparation waits for actual standalone results.

## Simulator authentication investigation

- Owner reported Login on the original Release artifact, followed by “Cannot reach your account.” Metro-off status and post-login behavior are not inferred from startup alone.
- Existing HTTPS service was healthy; explicit-CA verification from the Mac succeeded. Owner reported the private-tester prompt in Safari on the same Bubble Auth Test Simulator. No TLS exception or new trust import was used.
- Release Info.plist contains normal ATS (`NSAllowsArbitraryLoads=false`, local networking permitted); embedded bundle contains `https://localhost:8443`, with no Markdown-wrapped URL.
- Earlier working Debug artifact: local `Signature=adhoc`, `TeamIdentifier=not set`, empty displayed entitlements. Original Release: unsigned (`CODE_SIGNING_ALLOWED=NO` in the initial helper). The Swift transport reads Keychain before HTTP; the generic UI message cannot identify the exact native exception. Signing/Keychain is a hypothesis, not a confirmed cause or fixed login claim.
- Owner approved Simulator-only ad hoc rebuild, with no Apple account/certificate/profile changes. New output is `work/ios-ux-release-adhoc`; original unsigned artifact is retained for comparison. The helper builds/verifies only and never installs, terminates apps, deletes data or stops Metro.
- Signed artifact verification, Keychain access, login, session restoration, logout and comparison with Debug remain **Not Tested** until actual execution. Native cookies remain exclusively in Keychain; do not print/read them to prove access. Successful login plus process-restart restoration without the Bubble password can demonstrate functionality indirectly. Re-enter tester access after restart because it is memory-only.
- After signed installation into the same test Simulator, confirm Metro fully stopped, log in using only a synthetic account and verify Home/content. Terminate/relaunch; enter tester credentials locally and choose Restore existing session. Verify saved content/profile assets. If the error persists, collect only native error domain/code or a safe classification—never passwords, Authorization/Cookie headers or response bodies—and investigate further. Do not add entitlements, disable TLS, change Keychain groups or reset data as a workaround.
