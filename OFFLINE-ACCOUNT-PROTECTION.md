# Offline account protection

Review candidate based on PR #13 head `77b14cff21eb4ce4dae55692b807b9023d88e854`.
The parent PR remains unmerged. No backend, signing, trust, firewall, hosting or
existing SQLite schema change is part of this feature.

## Approved policy and UI

First login/registration still requires trusted HTTPS and the existing Spring
session/CSRF flow. iPhone now starts locked with explicit online sign-in/session
restoration or **Read cached notes offline**. It does not first make an automatic
verification request when the owner wants offline access. Online use still
requires server verification after every background return; no grace period was
added. Both paths require Face ID/device passcode through device-owner auth.

Offline access lasts at most seven days from the last successful `/users/me`
verification. Native monotonic uptime bounds elapsed time; offline unlock and
snapshot updates do not renew that timestamp. Reboot identity comes from
`kern.boottime`; a changed boot, unavailable boot metadata, backwards uptime,
wall/uptime discrepancy of 60 seconds or more, expiry, logout or known server
rejection locks offline access. This is a device-local policy, not a claim of
tamper-proof time or security on a compromised/jailbroken OS.

The separate reader is labelled **Offline—locally unlocked**, shows the last
online verification time, and supports read-only notes/checklists and local
title/body/item search. It reuses FileCard without navigation into online editors,
pin controls or image loaders. It does not mount online content/profile providers.
Both the JavaScript transport and native URLSession entry point refuse requests
while locked/offline, including GET and logout. Offline logout revokes local
access and removes the phone's cookie, explicitly stating no server logout was
sent. Switching back to online first locks/removes the offline reader, then
requires explicit online authentication. Network restoration never uploads or
authenticates automatically.

The native grant is independent of the existing 30-minute cookie/server session.
Unobserved server expiry or remote password/account changes cannot be learned
offline. The owner accepted delayed revocation up to the seven-day bound. An
actual server 401 (not the separate private-tester gate) revokes the local grant;
fresh online login is then required. Network/transport errors preserve the cache.
The existing server rejects password-version changes and deleted accounts; a
separate account-disable feature is not claimed.

## Native storage

`OfflineVault` uses the existing CryptoKit/Security/LocalAuthentication frameworks;
no package dependency or server service was added. Every backend-origin/account
UUID pair has a random 256-bit key and a separate hashed directory under
Application Support/BubbleOffline-v1. AES-GCM uses a fresh nonce for every write;
authenticated associated data binds format, backend, owner and record name.
Plaintext content and keys are never written to SQLite or application logs.

Keys, last-verification grant, active-account pointer and revocation tombstone
use `WhenPasscodeSetThisDeviceOnly` and user-presence Keychain access control.
Session cookies retain their original separate `WhenUnlockedThisDeviceOnly`
protection and never enter the cache. Keys never enter JavaScript. A new native
epoch invalidates late work after lock/logout; expected owner/base and snapshot
sequence checks reject cross-account and out-of-order writes. Recovered publishing
also checks the expected account natively immediately before HTTP dispatch.

Cache creation/update follows successful online verification and a complete content
fetch. The snapshot contains note/checklist data, account identity and Appearance
choices for consistent read-only rendering. Photos/Bubble images are not cached.
Writes are atomic with complete file protection and excluded from ordinary backup.
Snapshot limit: 8 MiB; each draft: 1 MiB; at most 100 draft records per account.
Failures are visible and retain prior encrypted data. Unsupported formats,
missing keys and bad ciphertext are not silently reset or overwritten.

Legacy `bubble.db`, its keys/migration version, profile-photo files, existing
account asset Keychain records and PostgreSQL data remain unchanged. Changing
backend origin intentionally cannot open another origin's vault automatically.
Legacy SQLite is not retroactively encrypted or assigned to an account.

## Protected drafts

Normal online note/checklist editors enqueue encrypted, serialized revisions on
changes and show Protecting/Protected/Failed feedback. A protection failure is not
reported as a saved draft. This is not offline editing: the offline reader cannot
create or edit content. Successful server saves clear that editor's recovery draft
best-effort; cleanup failures report that review is needed. Explicit Discard
removes only the matching protected draft. Authentication interruption does not
automatically delete drafts.

After online login to the same account, **Review protected drafts** offers explicit
selection/readback. Publishing requires a second confirmation and creates a NEW
Home note/checklist, never updating its original. No automatic synchronization,
restoration into editors, overwrite or retry is implemented. Empty drafts remain
readable but cannot be published. Content can be selected/copied for further
editing in the normal online editor.

A durable pending-publication marker is written before HTTP. Success records the
new item ID; an uncertain request or interrupted process leaves the draft pending
and prevents another publish from that record. Inspect Home/reconcile manually;
no automatic POST retry occurs. Discarding a protected draft requires separate
confirmation and never deletes server content. Both the native vault and HTTP
dispatch reject a late callback belonging to a different account.

## Preservation and recovery

Do not uninstall, erase a container, delete Keychain records, migrate storage,
change teams or restore over the phone to test this. Missing/inaccessible keys
and malformed records fail closed while retaining files. Online server content
can be downloaded again after a separately reviewed recovery; permanently lost
device-only keys can make drafts irrecoverable. Removing the device passcode can
delete these keys. No key regeneration is allowed over an existing vault.

App termination before a queued write completes can lose the latest edits; the
UI does not label those edits protected. App backgrounding locks the vault and
removes the private workspace; last in-flight work can fail rather than weakening
the local-auth requirement. This is not a guarantee against OS/storage failure.
No complete device backup/restore rehearsal has been performed. The backup
limitations in PERSONAL-IPHONE.md still apply, including device-only keys and
profile-photo references. No destructive recovery test is authorized.

## Building and validation

Existing native project only; never `prebuild --clean`. Run
`node scripts/prepare-offline-ios.mjs` to add only the Face ID purpose string to
the existing generated Info.plist. app.json contains the same string for future
generation. Refresh native source references with the already pinned CocoaPods
using `pod install --deployment`. The local preparation completed; application
project and Podfile.lock SHA-256 hashes were unchanged before/after. No installed
app, signing setting, provisioning or trust was changed.

Run frontend tests/TypeScript normally. On macOS with existing Xcode,
`sh scripts/test-offline-native.sh` compiles and executes the real CryptoKit and
clock/network-policy code against synthetic values, without accessing Keychain,
Simulator, account data or live files. These are not biometric/Keychain runtime
tests. Full native build must still be checked in Xcode. No install is automatic.
`node scripts/typecheck-offline-ios.mjs` repeats the full session/vault iOS SDK
typecheck using the existing Pods/Expo frameworks without signing or installing.

| Verification | Result at preparation |
| --- | --- |
| Existing frontend + new offline/draft tests | 116 Passed; zero failed/skipped |
| TypeScript | Passed |
| Actual native CryptoKit/policy executable | 25 checks Passed |
| Full native session/vault Swift typecheck against iOS SDK + actual Expo frameworks | Passed |
| CocoaPods deployment-mode source refresh | Passed; app project/lockfile unchanged |
| iOS Hermes export | Passed; not native compilation |
| Agent full Simulator build | Blocked before compilation by existing CoreSimulator/workspace restrictions; exit 66 |
| Owner-run Simulator Product → Build | Passed, owner-reported October 20; Build only |
| New-feature Simulator runtime/Face ID/Keychain | Not Tested |
| New-feature physical iPhone runtime | Not Tested |
| Actual seven-day wait, phone reboot, unavailable Keychain and corrupt on-device records | Not Tested on-device; pure policy/crypto boundaries tested |
| Destructive backup/restore | Not Tested; not performed |

For authorized native testing use synthetic accounts/content on a separately
approved test installation. Verify online login/cache, stop connectivity to the
backend, choose offline, read/search, and confirm zero application HTTP traffic.
Fully terminate/relaunch and locally unlock again. Verify wrong account cannot
read/publish another account's cache/draft; offline logout blocks reopening;
online rejection blocks fallback; returning from background requires fresh local
auth and (for online workspace) server verification. Check drafts across process
termination, explicit recovery, new-copy publishing, interrupted publication and
server-original preservation. Do not simulate corruption by deleting the owner's
keys or editing their live vault. Fault injection needs disposable synthetic
storage/native test infrastructure and separate approval if destructive.

PR is stacked on ios-ux-polish/PR #13 to keep the diff focused. CI's existing
read-only, secret-free workflows also run for that parent branch; no checks are
disabled and no deployment added. Backend/browser/recovery/security CI results
must be recorded against the new PR head, separately from the local results above.
Existing dependency advisories remain open. No merge or everyday-use approval is
implied by successful unit/type checks alone.
