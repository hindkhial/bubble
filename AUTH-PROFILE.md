# Authentication and profile polish

## Scope and baseline

Branch `ios-auth-profile-polish` starts at `008606201b59f70692bdccde6df758893b002127` on `ios-authentication` (draft PR #11). It inherits draft PRs #8, #9 and #10; none is merged. Remote integration remains `af922352531da0669d8de60a29b75ec862cd0e17`. The original frontend/backend branches are preserved.

The existing native authentication foundation has owner-confirmed Simulator registration, login, logout, session restoration and two-account isolation. Remaining native consent/offline/accessibility checks in IOS-ACCOUNTS.md remain open. The previous hosted run executed all ten browser scenarios successfully, but its runner incorrectly asserted nine; this branch corrects that runner assertion without accepting failed, flaky or skipped scenarios.

## Interface

- Welcome, Login and Signup have no Appearance action. Authenticated You retains Appearance and saved preferences.
- `BubbleLogo` extracts the exact two overlapping circles, dimensions and colors from Home; both Home and authentication reuse it. No new brand asset, animation or avatar replacement is introduced.
- You displays standalone Log Out after Settings. Security retains device-content consent/review and adds Change Password; logout is removed from Security in both native and browser regression interfaces.
- Change Password has current/new/confirmation fields, show/hide, Save Changes, Cancel, validation, progress and error feedback. Fields remain in component memory only. Keyboard avoidance, scrolling, secure autofill hints and 48-point actions are provided.

## Password security

`PATCH /api/v1/users/me/password` requires an authenticated Spring principal and the existing CSRF token. No client account ID is accepted. The service locks the authenticated user's row, verifies the current password, applies the existing 12-character/72-byte policy, rejects the existing password, and hashes the replacement with the configured bcrypt encoder. DTO string representations are redacted; responses contain no password or hash.

Incorrect current credentials return generic 400 without terminating a valid session. Password-change requests share the existing per-address/global authentication budget and have an additional bounded per-account five-attempt/minute budget. These are process-local limits, appropriate to current single-instance private staging; distributed throttling remains necessary before a multi-instance deployment.

After success, the current server session is invalidated. A non-reversible SHA-256 fingerprint of the encoded credential is bound to each server-side principal before credential erasure. On subsequent authenticated requests, the session filter compares that fingerprint with the current stored credential using a constant-time comparison. All sessions using the previous password are rejected, including on another application instance. An already-authorized request in progress is not retroactively cancelled. This adds one indexed user lookup per authenticated request; no raw credential or encoded hash is retained in session principals after login.

The client clears private in-memory state and native Keychain session credentials and requires login again. The non-secret logout lock prevents silent native restoration. Account content, local SQLite, profile assets and preferences are not deleted. A lost response is treated as an uncertain write rather than automatically retrying a password change; use a fresh login to reconcile. TLS, CSRF, native session origin checks and private staging protection stay enabled.

No schema migration, JavaScript/Java dependency update, new storage service, signing or trust change is needed. A fresh runtime scan found web-tester image packages libx11 1.8.13-r0 (CVE-2026-88806 High; CVE-2026-94283/94284/94285 Medium) and libxpm 3.5.19-r0 (CVE-2026-94287 Medium). The Dockerfile now requires the available compatible Alpine patches libx11 1.8.14-r0 and libxpm 3.5.20-r0. Backend and database scans had no findings. Final patched-image rescanning is pending. These packages belong to the private browser-test image, not the iOS JavaScript application. No advisory is ignored or suppressed.

## Validation record

| Check | Result |
| --- | --- |
| Frontend unit/render tests | Passed: 94 tests |
| TypeScript | Passed |
| PostgreSQL-backed backend tests and Maven package | Passed: 71 tests |
| Password success/current-password/policy/CSRF/authentication/owner isolation/session revocation | Passed against disposable PostgreSQL |
| Saved note/profile/preferences unchanged after password change | Passed against disposable PostgreSQL |
| iOS Hermes JavaScript export | Passed; not native compilation evidence |
| Production web regression build | Passed |
| Updated hosted browser/CI checks | Frontend/backend Passed at 91414dd; browser 9/11 Passed, two test sequencing/hidden-screen selector failures corrected; rerun pending |
| Fresh native compilation | Blocked before compilation: restricted Xcode/CoreSimulator access; existing workspace retained |
| Updated screens in iOS Simulator | Not Tested: session cannot reach CoreSimulator |
| Physical iPhone, VoiceOver, Dynamic Type and full focus review | Not Tested |

## Simulator follow-up

Use only the existing separate Bubble Auth Test Simulator and synthetic credentials. Do not uninstall Bubble or reset its storage.

1. Reload the current localhost development server. Check Welcome, Login and Signup: two-bubble logo, no Appearance action, working navigation. Check smaller iPhone sizes and dark mode.
2. Log in. On You, check Appearance and profile/avatar still work and Log Out is below Settings. Open Security: existing review controls and Change Password remain; no Log Out.
3. Open Change Password. With the keyboard visible, reach all fields and actions; test show/hide and Cancel. Confirm empty/weak/mismatched passwords are rejected without requests.
4. On a synthetic account, enter an incorrect current password: useful error, session retained. Change successfully, then confirm Welcome and the success notice appear. Old password fails, new password works, saved content and appearance remain.
5. Verify another existing synthetic session for the changed account requires login; a different account stays isolated. Check back navigation cannot reveal private screens after logout.
6. Leave unexecuted VoiceOver, focus management, Dynamic Type, reduced-motion and physical-device checks marked Not Tested. Existing dependency/security release gates remain open.

No public deployment, release tag, TestFlight submission or automatic merge is authorized.
