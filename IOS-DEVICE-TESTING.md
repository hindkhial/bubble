# Physical iPhone validation

## Entry checks — 2026-10-17

Baseline: ios-native-foundation, 6118f0eccd315fb2377ec58c072c51c396efea2f; PR #9 is draft/unmerged into integration. Original frontend, backend and integration branches are unchanged.

| Simulator prerequisite | Evidence and result |
| --- | --- |
| Native compilation | Passed: three readable Xcode activity logs report Build succeeded with a 122-target dependency graph. |
| Installation and launch | Passed: owner screenshots show Bubble's installed development client on iPhone 17 Pro Simulator; owner subsequently confirmed Home appears. |
| Local native restart persistence | Passed in owner-executed manual test: synthetic note and two-item checklist survived stopping/relaunching the app, including the completed-item state. This is not a phone reboot, physical-device test or automated SQLite bridge test. |
| Other native workflows | Not Tested: owner deferred remaining Simulator profile/photo/theme, keyboard, accessibility and other checks. |

Installed Simulator artifact metadata: com.hindkhial.bubble, app 0.1.0/build 1, minimum iOS 16.4, iphonesimulator26.5 SDK. The screenshot identifies the Simulator model; the SDK value alone does not establish the running device OS. Xcode 26.6 (17F113) remains selected. Workspace CocoaPods 1.17.0/Ruby 3.4.8 are available, and 110 pods were installed. Build the .xcworkspace, not the standalone .xcodeproj. The original one-target build omitted Pods and reported missing Expo module maps; subsequent 122-target builds succeeded. The Hermes script-output warning is not a failed build.

## Current device gate

Physical iPhone model, iOS version, pairing, Developer Mode, authorized team, identifier availability and provisioning are **Not Verified**. Device discovery from this session timed out with CoreDeviceService XPC connection errors; this does not prove that no phone is connected. No DEVELOPMENT_TEAM is selected in the generated app project. No Apple credentials, signing identities or provisioning-profile contents were accessed.

Before installation, obtain the model/iOS version and pairing status from owner-operated Xcode Device Hub/Devices and Simulators. Confirm iOS >=16.4 and that this Xcode supports the installed device OS. Use USB initially. Do not enable Developer Mode, change signing, register an identifier/device, create signing assets or install until the owner approves the concrete setup. The approved development identifier remains com.hindkhial.bubble, but its availability with the chosen team is not verified and no registration has been approved.

Apple documents [running on a device](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices) and [Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device). The owner signs in through Xcode personally; never request passwords, verification codes, private keys or account tokens. A Personal Team or authorized developer team must be selected. Automatic signing may register identifiers/devices and create certificates/profiles, so it requires explicit approval rather than being enabled as a troubleshooting shortcut. No paid membership purchase, App Store record, TestFlight upload or distribution is authorized.

## Proposed installation after approval

Prefer a local, development-signed **Release configuration with an embedded JavaScript bundle** for offline validation. Release configuration is not permission to distribute, archive/upload, use App Store signing or publish anything. Verify the final installed artifact contains its bundle/assets and uses development signing before relying on it. Keep the same bundle identifier and installation when updating; stop on an existing-app/team/entitlement conflict rather than uninstalling and risking user data.

The existing Debug Simulator build depends on localhost Metro. Its IPv6-only localhost listener initially conflicted with the client's 127.0.0.1 URL; starting Node with --dns-result-order=ipv4first resolved it, and the owner confirmed Home. A phone's localhost is the phone, not the Mac. Do not bind Metro/backend to a LAN/public interface, add tunnels, alter firewall rules or install certificate trust without separate approval. An embedded-bundle device build avoids needing Metro exposure for this test plan; actual device startup remains untested.

## Device execution matrix

Record the exact source commit, configuration, bundle/build version, phone model, iOS version, tester, date, observed values and errors for each run. Use synthetic notes and a synthetic photo; do not collect personal photos, device identifiers or account credentials in Git. Do not uninstall, erase, clear storage or reset schemas. Stop immediately on data loss or a reproducible crash.

| Test and expected result | Status |
| --- | --- |
| Signed physical build installs and opens Home; all bottom tabs work | Not Tested |
| Create/edit note; close/reopen and verify exact text | Not Tested |
| Create/edit checklist; complete and reorder tasks; verify ordering/states | Not Tested |
| Pin/unpin and search title/body/item text; open result | Not Tested |
| Profile name/bio/avatar save and survive relaunch | Not Tested |
| Pick synthetic profile image, relaunch, replace/remove; denied/limited access preserves prior value | Not Tested |
| Light/Dark/System and accent persist after relaunch | Not Tested |
| Airplane mode: cold launch bundled app, edit/create, reopen; no API or Metro required | Not Tested |
| Restart iPhone: all exact saved notes/tasks/pins/profile/photo/theme remain | Not Tested |
| Account and local-only isolation, native TLS/session/CSRF | Not Tested — native accounts disabled |
| Notch/home indicator and all modal content remain reachable | Not Tested |
| Keyboard focus, dismissal and fields/buttons above keyboard | Not Tested |
| Navigation/back gestures, draft preservation and unsaved-change prompts | Not Tested |
| VoiceOver labels, reading order, modal focus and operable controls | Not Tested |
| Dynamic Type at large accessibility sizes; readable, wrapping and scrollable content | Not Tested |
| Touch targets, Reduce Motion, Light/Dark contrast | Not Tested |
| Background/foreground with drafts and committed data retained | Not Tested |

For restart tests, seed distinctive values, force-close/reopen the same app, then reboot the phone and verify each value again. An app restart does not count as a phone reboot. Recheck airplane-mode cold launch with Metro unavailable. Record Passed, Failed or Not Tested separately; screenshots of Home alone do not pass editing or persistence.

## Native accounts and security

Native login/resume remain explicitly disabled. The native API configuration requires HTTPS; Spring Boot's authentication, secure cookies and CSRF protections remain unchanged. Current private staging is loopback-only and cannot be directly reached from an iPhone. No private HTTPS route or phone trust plan is approved. Do not embed tester-gate credentials, weaken TLS/CSRF, copy CA private keys, expose PostgreSQL or enable accounts to make a demonstration work.

Before enabling native accounts, separately approve private reachability and certificate trust scope/removal, then test cookie creation/persistence, CSRF token refresh, session rotation/expiry, logout/restoration and cross-account/local-data isolation. A browser pass is not native networking evidence. Existing dependency findings and human accessibility/physical-device gates remain release blockers pending their review.

## Regression and completion status

Fresh preflight: TypeScript and all 68 frontend tests passed with zero failures/skips. No backend behavior changed, so backend tests were not rerun locally for this documentation-only preparation. Existing CI/browser checks are separate regression evidence, never phone-test results. No new physical build or installation was attempted because device/team/security approvals are pending. No application defect or new code fix is claimed. Physical validation remains incomplete.
