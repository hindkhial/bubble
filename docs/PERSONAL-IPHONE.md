# Personal iPhone edition

**Offline-protection feature candidate:** OFFLINE-ACCOUNT-PROTECTION.md describes
the encrypted read-only cache and protected drafts on its separate branch. Its
owner approved a same-identity update and reported the core offline and draft
workflows Passed on iPhone 13 / iOS 26.1 on October 20, 2026. See
IOS-OFFLINE-VERIFICATION.md for the separate physical results and open gates.
The original installed-build limitations below remain historical baseline evidence;
the offline candidate does not change the public-distribution roadmap.

Active direction, October 20, 2026: Bubble is for the owner's iPhone 13 using a
free Xcode Personal Team and `com.hindkhial.bubble`. TestFlight, App Store,
paid membership, public hosting/web distribution and Android distribution are
deferred. Existing release documents remain historical/future reference; security,
data safety and relevant iPhone accessibility checks remain applicable. No new
features, authentication shortcuts or infrastructure are introduced here.

## Readiness

The owner has built, installed and launched a signed Release app on the physical
iPhone, logged in, restored a session, logged out/in and reported saved changes
retained. This is usable for private, connected testing, not yet a dependable
offline personal notebook. Mandatory online verification and temporary backend
connectivity are genuine limitations, irrespective of distribution plans.

Verified integration baseline: `ed80addc932535caf3d841d108af7d5bf0111402`.
The existing `ios-ux-polish` branch/PR #13 adds the native polish; it is unmerged.
No original branch, installed app, database, signing configuration, firewall or
trust setting is changed by this personal-use follow-up.

## Signing and installation

Apple's [Personal Team documentation](https://developer.apple.com/help/account/basics/about-your-developer-account)
states that free development profiles expire seven days after issuance and require
rebuilding/reinstalling. No paid membership is needed for this development use.
This is not permanent signing. The current physical artifact's embedded metadata
has `LocalProvision=true`, one provisioned device, development `get-task-allow`,
and validity October 20, 2026 01:02:16 UTC to October 27, 2026 01:02:16 UTC.
This was a read-only metadata inspection, not a new Apple-account operation or
independent CMS-chain verification. Existing app signature verification passed.
The owner confirmed Xcode labels the selected “hind khial” team Personal Team.
No extra paid-capability entitlement was found. Retain that team for renewal.

After a verified backup and explicit approval to update the installed build:

1. Connect/unlock iPhone; open `ios/Bubble.xcworkspace`, Bubble target, Signing &
   Capabilities. Retain the same Personal Team and bundle identifier. Use automatic
   development signing; if changing this is necessary, obtain approval first.
   Stop on a team, entitlement, profile or bundle-ID conflict. Never solve it by
   uninstalling or selecting a different team. The owner handles Apple prompts.
2. Keep the approved private HTTPS endpoint reachable and its certificate valid.
   A phone's localhost is not the Mac. Do not broaden access or import trust as a
   build workaround. Public `EXPO_PUBLIC_*` values must never contain credentials.
3. From the repository, build only (substitute the approved current origin):

   ```sh
   EXPO_PUBLIC_API_URL=https://192.168.1.27:8444 sh scripts/build-ios-personal-release.sh
   ```

   The helper uses Release/iphoneos, fresh Metro transforms, existing signing and
   a separate output directory. It verifies an embedded bundle, strict signature
   and exact HTTPS origin. It does not install, enable provisioning updates,
   change signing, stop services or access Apple accounts. A signing/profile
   failure must be resolved by the owner in Xcode, not bypassed. No Simulator ad
   hoc signing settings are suitable for this phone.
4. After separate installation approval, use Xcode's device Apps/Installed Apps
   panel to update with the exact printed artifact using the same identity, as in
   the owner-executed successful installation. UI may accept an app or require a
   development package depending on Xcode; stop on incompatibility rather than
   deleting the app. Do not use Archive/Distribute/App Store workflows.
5. Launch from the phone Home Screen with Metro stopped. Verify login/restore,
   exact saved note/checklist state, profile/photo and Appearance. An update is
   expected to preserve the sandbox with matching identity, not guaranteed merely
   by matching bundle ID. Stop on any missing content and preserve the backup.

Weekly: before the actual profile expiry, back up, connect the same phone, let
Xcode refresh development provisioning under the same Personal Team, rebuild the
approved origin and update in place after approval. If Xcode requests account or
certificate changes, the owner reviews them. Verify the newly issued expiration
and retained content. Expiry prevents launch; it is not permission to uninstall.
Apple's seven-day profile limit and TLS expiry are separate clocks.

## Authentication and availability

`modules/bubble-session/ios/BubbleSessionModule.swift` uses normal URLSession TLS,
rejects redirects, stores the cookie in `WhenUnlockedThisDeviceOnly` Keychain and
keeps tester credentials only in memory. Session material is not returned to JS.
The native cookie has a local 30-minute lifetime; the server's 30-minute idle
session timeout remains authoritative. Logout clears it and locks protected UI.

`src/state/Account.tsx` verifies `/users/me` on cold startup and on return from
background. A 15-minute foreground window also requires online re-verification.
A previously authenticated user therefore cannot reliably reopen protected content
without the backend. Enter gateway credentials again after process termination,
then Restore existing session; if expired, sign in again. No password is cached.

Account notes/checklists, Bubbles/content photos, name/bio and preferences use
PostgreSQL APIs and are held in memory on the phone, not a SQLite account cache.
Search may operate on already-loaded memory while the current verified session
remains mounted, but saves/mutations require the backend; this is not supported
offline account use. Network errors retain drafts; do not blindly retry uncertain
writes. Reconnect and inspect server state before retrying.

Legacy device-only content remains in `bubble.db`, separate from account data.
Its tested SQLite persistence does not prove offline account persistence. Mandatory
iOS login still gates access; this follow-up does not restore a local-only bypass.
Nothing is automatically transferred to an account or migrated/deleted.

The backend can remain on the Mac for same-network personal use, with trusted
HTTPS, source restrictions, tester gate, Mac awake and Docker/services running.
Away from that private network, with the Mac asleep/off, an expired certificate,
or the four-hour temporary proxy stopped, account verification/operations fail.
The current phone certificate expires October 23, 2026 at 02:54:44 UTC; renewals,
trust changes and firewall changes need separate approval. Do not rely on this
temporary setup as unattended permanent service. No public endpoint is needed or
authorized. A secure offline account cache/unlock/write-reconciliation design is
separate significant work, not implemented or approved by this document.

## Backups before any installation change

No new backup or restore of the owner's data was performed. A complete physical
backup/restore rehearsal remains Not Tested; do not label this procedure tested
end to end. Preserve the original synthetic Simulator/CI recovery evidence only
for its original scope.

1. Finish saves, fully close Bubble without uninstalling, and use Xcode's device
   app menu **Download Container**, if offered. Save the entire `.xcappdata`
   outside Git on protected/encrypted owner storage, dated with build/source and
   signing identity. Never share it here. Apple's [container extraction example](https://developer.apple.com/library/technotes/tn2350/_index.html)
   describes this operation; newer Xcode may place it in Device Hub.
2. Verify a copied container, not the live app: retain the SQLite database **and
   WAL/SHM companions**, Documents/profile-photos, and Library/Application Support/
   BubbleAccountPhotos. A database-only file copy while running can lose WAL data.
   Use SQLite integrity/record checks against an isolated copy; compare synthetic
   known content and image hashes. Do not log content or overwrite source files.
3. Important limitation: account avatar/photo references are in device-only
   Keychain; account photo files are explicitly excluded from normal OS backups.
   Container download does not export Keychain. Even a complete container is not
   proven to restore those references. Keep owner-approved originals of chosen
   profile photos separately so they can be reselected. Native avatar/photo
   assets are scoped to both backend origin and account; changing origin can
   make them appear absent without deleting files. Do not switch origins casually.
4. Back up PostgreSQL separately using the existing protected `pg_dump -Fc`
   procedure in STAGING.md. It includes account content, profiles, preferences
   and library images, not native profile-photo metadata. Preserve existing
   database volume, protected secrets and matching app/schema information. Never
   run `down -v`, prune volumes or rotate DB passwords as a recovery shortcut.
5. Validate a dump by restoring only into a separately approved disposable
   database and comparing counts/fixtures. Do not restore over the live database,
   replace a phone container, or erase a Simulator without approval. Until an
   owner-container/keychain-safe recovery is rehearsed, full device recovery
   remains an open data-safety gate. Encrypted Finder backup can supplement this,
   but cannot be assumed to cover excluded files or device-only Keychain items.

## Evidence and remaining checks

Physical results below are owner-executed reports on iPhone 13 / iOS 26.1,
confirmed after correcting an initial 16.1 typo. The artifact minimum is iOS 16.4;
26.1 is compatible. These reports are separate from automated tests.

| Check | Current evidence |
| --- | --- |
| Signed Release build, embedded JS/origin, install and Welcome launch | Passed: owner build output and installed-app report; existing artifact signature checked |
| Native HTTPS account login to Home | Passed: owner report after approved CA trust/private gateway |
| Create/edit note, checklist completion, Search, profile bio, accent | Passed: owner reported all requested steps worked |
| Close/reopen, gateway access + session restoration, retained changes | Passed: owner report; initial connection error resolved after re-entering memory-only gateway credentials |
| Logout, fresh login and retained account content | Passed: owner report |
| Native profile photo capture/replacement/relaunch on physical phone | Not Tested separately; prior Simulator photo persistence passed |
| Signup, password change and two-account isolation on physical phone | Not Tested; prior Simulator reports/automated coverage are separate |
| Actual session expiry, unavailable-Mac cold start, network-loss draft handling | Not Tested on this physical build; online requirement confirmed in source |
| Legacy SQLite on physical phone | Not Tested; Simulator restart preservation previously owner-confirmed |
| Same-identity update with existing known content, full backup/restore | Not Tested as a controlled data comparison; no new installation authorized |
| VoiceOver, Dynamic Type, Reduced Motion, full keyboard/safe-area audit | Not Tested on physical phone |
| Second LAN device blocked by temporary firewall | Not Tested: explicitly owner-deferred; do not convert to Passed |

Existing node-forge/braces/uuid assessments remain in RELEASE-SECURITY.md. Personal
scope does not suppress dependency findings. No new security scan is claimed.
No backend changes are needed for this follow-up. Current automated results are
recorded in TESTING.md. No merge, install, trust/firewall alteration, release tag,
public deployment, paid subscription or distribution is authorized here.
