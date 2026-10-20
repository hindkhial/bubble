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
| Frontend tests | Passed | 100 local tests; includes actual announcement hook, flexible form styles, long-dialog structure/actions, scalable navigation labels/actions and Release gate UI |
| TypeScript | Passed | Local `tsc --noEmit` |
| Native Release compilation | Blocked | Agent attempt exited 66 before compilation; CoreSimulator services unavailable and Xcode rejected the existing workspace in this restricted session |
| Embedded bundle in a native Release app | Not Tested | No successful native Release artifact produced |
| Native Simulator launch, layout and persistence after these changes | Not Tested | Owner execution required below |
| Metro stopped during standalone test | Not Tested | No launch test performed; existing development server was not stopped by the agent |
| Physical iPhone pairing/signing/install | Not Tested | Deferred until standalone Simulator verification passes; local signing settings untouched |
| VoiceOver, largest Dynamic Type, Reduced Motion and native visual review | Not Tested | Execute the matrix below; static checks are not a native usability pass |

Local logs/artifacts live outside Git in the task's `work` directory. Hosted results are recorded in the pull request at its exact head. Backend tests, browser checks and image scans are separate from native validation.

## Run on the Mac: build first

Use the existing generated workspace and installed Pods. Do not run a clean Expo prebuild, uninstall Bubble, erase Simulator, change signing or import a certificate.

```sh
cd "/Users/macbookpro/Documents/Codex/2026-10-13/hey-can-you-please-access-to/Bubble"
git branch --show-current
sh scripts/build-ios-simulator-release.sh
```

The branch should be `ios-ux-polish`. The script builds only for Simulator, with Simulator signing disabled at the command level; it does not alter physical-device signing. It sets the existing HTTPS loopback backend and public tester-UI flag. Stop on a build error and report the first actual error. A successful JavaScript export is not a native build.

If Terminal is blocked but Xcode works, open `ios/Bubble.xcworkspace`, select Bubble and the existing **Bubble Auth Test** Simulator. Product → Scheme → Edit Scheme → Run → Info → Build Configuration → Release. Set `EXPO_PUBLIC_API_URL=https://localhost:8443` and `EXPO_PUBLIC_PRIVATE_BETA_ACCESS=1` in the environment from which Xcode is launched for bundling (Run-only environment variables do not configure the build bundle). Prefer the Terminal script for reproducible build-time values; do not change signing to solve this.

## After a successful build: actual standalone test

1. Keep the existing private HTTPS backend running. Use the existing **Bubble Auth Test** Simulator with its previously approved CA; do not import trust into another Simulator or either macOS keychain. No certificate warning bypasses.
2. In every Terminal running Metro, press Control-C. Check `lsof -nP -iTCP -sTCP:LISTEN` for remaining Metro ports, including 8083, 8084 and 8085. Close only known Metro processes; do not stop Docker/backend services. Record whether Metro is fully stopped.
3. Run `xcrun simctl list devices booted` and identify the UUID of **Bubble Auth Test**, not a physical device or the original personal Simulator. If no test Simulator is booted, open it in Simulator first.
4. In Terminal, set `SIMULATOR_UUID` to that exact UUID, then run:

```sh
APP="$PWD/../work/ios-ux-release/Build/Products/Release-iphonesimulator/Bubble.app"
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

Existing node-forge/braces High findings and uuid Moderate finding remain tracked in DEPENDENCY-RISKS.md. A green runtime scan does not clear build-tool findings. Manual accessibility, physical-iPhone and standalone checks stay open. No Apple identifier registration, signing/provisioning changes, TestFlight/App Store submission, release tag, public deployment or automatic merge is authorized by this work. Phase 3 device preparation waits for actual standalone results.
