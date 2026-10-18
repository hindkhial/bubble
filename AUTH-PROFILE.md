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

After success, the current server session is invalidated. A non-reversible SHA-256 fingerprint of the encoded credential is bound to each server-side principal before credential erasure. The session filter runs after standard security-header and CORS processing, so stale-session 401 responses remain non-cacheable and readable by allowed browser clients. A real HTTP regression checks no-store, nosniff and the allowed origin before that old session has been rejected elsewhere. On subsequent authenticated requests, the session filter compares that fingerprint with the current stored credential using a constant-time comparison. All sessions using the previous password are rejected, including on another application instance. An already-authorized request in progress is not retroactively cancelled. This adds one indexed user lookup per authenticated request; no raw credential or encoded hash is retained in session principals after login.

The client clears private in-memory state and native Keychain session credentials and requires login again. The non-secret logout lock prevents silent native restoration. Account content, local SQLite, profile assets and preferences are not deleted. A lost response is treated as an uncertain write rather than automatically retrying a password change; use a fresh login to reconcile. TLS, CSRF, native session origin checks and private staging protection stay enabled.

No schema migration, JavaScript/Java dependency update, new storage service, signing or trust change is needed. A fresh runtime scan found web-tester image packages libx11 1.8.13-r0 (CVE-2026-88806 High; CVE-2026-94283/94284/94285 Medium) and libxpm 3.5.19-r0 (CVE-2026-94287 Medium). The Dockerfile now requires the available compatible Alpine patches libx11 1.8.14-r0 and libxpm 3.5.20-r0. Backend and database scans had no findings. Final patched-image rescanning Passed with zero findings across frontend/backend/PostgreSQL, with scan/archive/runtime image identities checked. These packages belong to the private browser-test image, not the iOS JavaScript application. No advisory is ignored or suppressed.

## Validation record

| Check | Result |
| --- | --- |
| Frontend unit/render tests | Passed: 95 tests |
| TypeScript | Passed |
| PostgreSQL-backed backend tests and Maven package | Passed: 71 tests |
| Password success/current-password/policy/CSRF/authentication/owner isolation/session revocation | Passed against disposable PostgreSQL |
| Saved note/profile/preferences unchanged after password change | Passed against disposable PostgreSQL |
| iOS Hermes JavaScript export | Passed; not native compilation evidence |
| Production web regression build | Passed |
| Local secure browser suite | Passed: all 11 at 517b922, zero skipped/flaky; sandbox/TLS and temporary-trust removal verified, container removed |
| Updated hosted browser/CI checks | Previous frontend/backend Passed; final-head results are recorded in the PR |
| Fresh native compilation | Blocked before compilation: restricted Xcode/CoreSimulator access; existing workspace retained |
| Updated screens in iOS Simulator | Passed by owner in Bubble Auth Test, iPhone 17 Pro / iOS 26.5: two-bubble branding, no authentication Appearance, standalone You Log Out, Security Change Password and no Log Out |
| Native password-change flow | Passed by owner with synthetic account: mismatch and wrong-current validation, successful change to Welcome, new-password login and retained saved test content |
| Physical iPhone, VoiceOver, Dynamic Type and full focus review | Not Tested |

The first local eleven-scenario run passed nine and exposed two test issues; the hosted rerun passed ten, with one more hidden-field selector needing the same visible-screen scope. One local rerun stopped making progress and was terminated without claiming success; its temporary CA was removed and fresh Chromium distrust was reconfirmed before container deletion. No timeout, retry, TLS or sandbox protection was relaxed.

## Simulator follow-up

The owner executed the branding/navigation checks and password validation/change/new-login/content-retention checks above successfully. Remaining responsive, keyboard, VoiceOver, Dynamic Type and physical-device checks are not implied by those results. Use only the existing separate Bubble Auth Test Simulator and synthetic credentials. Do not uninstall Bubble or reset its storage.

1. Reload the current localhost development server. Check Welcome, Login and Signup: two-bubble logo, no Appearance action, working navigation. Check smaller iPhone sizes and dark mode.
2. Log in. On You, check Appearance and profile/avatar still work and Log Out is below Settings. Open Security: existing review controls and Change Password remain; no Log Out.
3. Open Change Password. With the keyboard visible, reach all fields and actions; test show/hide and Cancel. Confirm empty/weak/mismatched passwords are rejected without requests.
4. On a synthetic account, enter an incorrect current password: useful error, session retained. Change successfully, then confirm Welcome and the success notice appear. Old password fails, new password works, saved content and appearance remain.
5. Verify another existing synthetic session for the changed account requires login; a different account stays isolated. Check back navigation cannot reveal private screens after logout.
6. Leave unexecuted VoiceOver, focus management, Dynamic Type, reduced-motion and physical-device checks marked Not Tested. Existing dependency/security release gates remain open.

No public deployment, release tag, TestFlight submission or automatic merge is authorized.

## Changed files

- `AUTH-PROFILE.md`
- `RELEASE-OPERATIONS.md`
- `TESTING.md`
- `backend/src/main/java/com/bubble/config/SecurityConfig.java`
- `backend/src/main/java/com/bubble/controller/UserController.java`
- `backend/src/main/java/com/bubble/dto/ChangePasswordRequest.java`
- `backend/src/main/java/com/bubble/entity/User.java`
- `backend/src/main/java/com/bubble/repository/UserRepository.java`
- `backend/src/main/java/com/bubble/security/AccountPrincipal.java`
- `backend/src/main/java/com/bubble/security/AuthRateLimitFilter.java`
- `backend/src/main/java/com/bubble/security/PasswordSessionFilter.java`
- `backend/src/main/java/com/bubble/service/AccountService.java`
- `backend/src/test/java/com/bubble/PasswordChangeIntegrationTest.java`
- `deploy/staging/frontend.Dockerfile`
- `e2e/workspaces.spec.ts`
- `scripts/ci/browser-tests.mjs`
- `src/api/account.ts`
- `src/api/authValidation.ts`
- `src/app/(app)/account.tsx`
- `src/app/(app)/change-password.tsx`
- `src/app/(app)/file/[id].tsx`
- `src/app/(app)/index.tsx`
- `src/app/(app)/you.tsx`
- `src/components/AuthExperience.tsx`
- `src/components/BubbleLogo.tsx`
- `src/components/LogoutButton.tsx`
- `src/components/NativeAccountSettings.tsx`
- `src/state/Account.tsx`
- `tests/api.test.mjs`
- `tests/auth-profile-ui.test.mjs`
- `tests/native-storage.test.mjs`

## Full integration-diff review

Reviewed requested head b97a0b55dd63e011bb385cb2937e3f0fdaffebb3 against integration af922352531da0669d8de60a29b75ec862cd0e17. GitHub's 124 files were the union of 109 inherited files and 28 files changed by this feature, with 13 shared files (109 + 28 - 13 = 124). There were 96 inherited-only files and 15 feature-only files; repeated edits are not duplicate source copies.

The ancestry is linear: #8 release-readiness → #9 ios-native-foundation → #10 ios-simulator-polish → #11 ios-authentication → #12 ios-auth-profile-polish. The device-validation commit 3964361 is already included through #10 and does not need a separate merge. Each PR still targets integration, which explains the accumulated diff. No unrelated new feature, divergent branch, destructive migration or hidden deployment was found. Earlier dated status documents are historical; IOS-ACCOUNTS.md, this record and per-head PR checks describe the current authentication implementation.

Review reproduced one inherited error-handling defect: the local checklist tap evaluated a synchronous SQLite write before Promise.resolve could catch it. The handler now catches both synchronous storage errors and rejected account writes, retaining the last saved state and displaying the provider error on the detail screen. The regression failed before the fix and passes afterward. The recovery runbook also now specifies V1–V3 and all nine tables, matching the existing executable CI drill. No schema or backend code changes were needed.

After these review corrections the focused delta includes 31 files; the full integration comparison still contains 124 because the three additional paths were already inherited. The complete updated file list is in the Changed files section. Frontend tests now total 95; TypeScript passes. Backend behavior is unchanged, so its prior 71-test evidence remains applicable and the full hosted workflow must also pass on the correction head. Final results and review readiness are recorded on PR #12.

Recommend individually approved merge commits in order #8 → #9 → #10 → #11 → #12, rerunning checks/reviewing each reduced diff after integration advances. Do not merge #12 alone to bypass approval of inherited work. Squashing earlier entries breaks the ancestry relationship and requires separately reviewed restacking/revalidation. Existing High dependency findings and native/manual release gates are not accepted by code-review readiness; #8's draft/approval restrictions remain in force. No merge, branch deletion, deployment or release is performed by this review.
