# Personal iPhone offline verification

## Build and evidence scope

October 20, 2026, Africa/Casablanca. iPhone 13 / iOS 26.1, existing free Personal
Team, bundle identifier `com.hindkhial.bubble`. PR #13 (`ios-ux-polish`,
77b14cff21eb4ce4dae55692b807b9023d88e854) is the parent of PR #14
(`offline-account-protection`, tested code head
2d7e3bb7e38a6e447574b813454b23365620f960). Both remain unmerged.

All physical outcomes below were executed and reported by the owner in chat,
not by automated device control. Source/build review is separate evidence.
Simulator compilation was previously owner-reported Passed; the new offline
Simulator runtime was not exercised. Existing browser tests are not iPhone tests.

The owner reported the Release helper completed with embedded-origin/signature
verification. The resulting app was located in `work/ios-personal-release`, not
the initially requested alternate output directory. Read-only artifact checks
found the offline JS entry, native vault/unlock symbols, expected origin, bundle
identifier, display name and existing team identifier. the restricted session could not verify
certificate trust in its restricted session; the owner's separate strict
codesign verification returned no output (Passed). No trust workaround was used.

The owner saved a Download Container `.xcappdata` backup, then explicitly approved
updating the installed app with the same identifier/team. Xcode's Replace App
prompt was an app update, not Replace Container. No uninstall or container reset
was performed. The container is not a backup of device-only Keychain keys;
restoration has not been rehearsed.

## Physical results

| Check | Result | Actual evidence |
| --- | --- | --- |
| Signed development Release build and local strict signature verification | Passed | Owner reported helper success and no-output strict verification |
| Install/update and native launch | Passed | Owner installed the new app and opened Home |
| Existing account download after online login | Passed | All existing notes/checklists visible; no protection error |
| Encrypted snapshot functional read after termination | Passed | Read cached notes offline opened the dedicated reader with all notes/checklists |
| Face ID local unlock | Passed | Owner reported successful Face ID unlock |
| Passcode fallback | Passed | Owner selected fallback and unlocked successfully |
| Every foreground return requires fresh unlock | Passed | Leaving for Home and returning required another unlock |
| Cancelled local unlock keeps content hidden | Passed | Owner cancelled and confirmed notes remained hidden |
| Endpoint unavailable during offline reopening | Passed | Owner stopped proxy; Safari reload failed; Bubble still unlocked offline |
| Local read-only search and note/checklist viewing | Passed | Search and reading worked with proxy stopped; completion states retained |
| Encrypted synthetic draft survives process termination | Passed | Unsaved synthetic note reappeared intact in protected-draft review after online authentication |
| Explicit new-copy publication | Passed | Owner confirmed publication; one synthetic Home note appeared; existing notes unchanged |
| Confirmed draft cannot be published again | Passed | Review showed published status and no repeat-publish option |
| Latest successful server content appears in cache | Passed | New synthetic published note was available offline |
| Offline logout prevents later cached access | Passed | After logout and termination, cached access required online verification and no notes were visible |
| Reconnect and online login after offline logout | Passed | Owner confirmed existing content and synthetic note intact, no protection error |
| Zero actual HTTP attempts during offline interval | Inconclusive | Two Instruments captures showed no HTTP tasks but network connections were attributed to Unknown, not reliably to Bubble |
| Seven actual days elapsed without online verification | Not Tested | Pure native policy boundary checks Passed; physical waiting was not performed |
| Expiry while offline on a physical device | Not Tested | No time manipulation or reduced-duration production policy |
| Reboot requires online verification | Not Tested | No phone reboot in this session; native boot-identity policy tested automatically |
| Server rejection/revocation and account switching | Not Tested | Earlier automated tests/source guards are separate; no second physical account or induced rejection here |
| Missing keys, corrupt ciphertext, unsupported format on-device | Not Tested | Crypto/policy tests Passed with synthetic values; owner's keys/files were not changed |
| Interrupted publication after dispatch | Not Tested | Actual-component tests cover pending/no-retry and authentication interruption; no physical induced uncertain POST |
| Full backup/restore or device loss recovery | Not Tested | No destructive recovery; device-only keys and excluded files remain limitations |

No functional failure was reported in the executed physical scenarios. No
byte-for-byte device-container comparison or forensic inspection of the owner's
encrypted files was performed. Functional decryption through the native vault
and actual CryptoKit tests support the encryption assessment; they do not prove
complete OS/Keychain security under compromise.

At approximately 21:50–21:57 Casablanca time, the owner attempted two physical
Instruments Network recordings (about 72 and 48 seconds). The owner confirmed
searching for and opening the synthetic note during the first recording. A
target-selection screenshot showed the physical iPhone on iOS 26.1 and Attach to
Bubble (27576). Both result screenshots showed an empty HTTP Traffic timeline,
but Network Connections bytes were attributed to an Unknown process. The second
attempt did not resolve attribution. These screenshots neither prove Bubble sent
those bytes nor prove zero requests. No private trace was obtained or analyzed;
no online capture, security workaround or additional installation was requested.

## Automated and review evidence

After the physical reports, 116 frontend tests (zero failures/skips), TypeScript
and 25 native CryptoKit/clock/network-policy checks Passed. Those native checks
use synthetic values, not the owner's Keychain or database. Automated transport
spies exercise GET/POST/PATCH/DELETE while offline: none reach the native bridge
or global fetch. This does not substitute for an on-device network recording.

Code-head GitHub run [39377084849](https://github.com/hindkhial/bubble/actions/runs/39377084849)
Passed all three jobs: frontend checks/build; 71 backend/PostgreSQL tests and
packaging; 11 sandboxed private-HTTPS browser scenarios, compatible rollback,
migrations/backup-restoration/restart and runtime image scans with zero reported
findings. Temporary browser trust removal was verified. Existing dependency
advisories are separate, unsuppressed risks; zero runtime-image findings do not
close every development dependency advisory.

Review focused on both PRs against their actual bases, native storage/transport
authorization, TLS/CSRF/session preservation, protected routing, draft ownership
and uncertainty, foreground locking and personal-build helpers. No new blocking
code defect was identified. Neither PR changes backend code/schema or dependency
versions; no live-data migration was introduced. Offline snapshots/drafts are
separate from legacy SQLite and photo storage. Existing data preservation is
owner-observed, not a destructive recovery guarantee.

## Remaining validation and personal-use requirements

- Keep the physical traffic check open. [Apple Instruments' Network/HTTP Traffic
  tool](https://developer.apple.com/documentation/foundation/analyzing-http-traffic-with-instruments)
  can record decrypted headers/content in plaintext: only use a separately
  consented offline-only recording and keep it private; never upload a trace or
  record account passwords. Do not use Product > Profile if it would rebuild or
  reinstall a different app without approval. Attach to the already approved app.
- Do not change the phone clock or delete keys to simulate expiry. Seven-day,
  reboot, clock and corruption boundaries already have synthetic native tests;
  the physical outcomes above remain Not Tested until actually executed.
- Online login/registration and renewal still need the private trusted HTTPS
  backend, current tester credentials and a valid certificate. Offline mode is
  read-only and can delay awareness of remote revocation for up to seven days.
- Offline unlocks never extend the last successful online verification. Reboot,
  suspicious clock changes, known rejection and expiry require online verification.
- The current temporary certificate expires October 23, 2026 at 03:54:44
  Africa/Casablanca (02:54:44 UTC). No renewal/trust or firewall change was made.
- Free Personal Team provisioning still needs periodic renewal under the same
  team/identifier. Do not uninstall to renew. No signing changes were made.
- Device-only key loss or passcode removal can lose access to unsynced drafts;
  abrupt termination before a write finishes can lose the newest edits. Photos
  are preserved by existing storage, not included in the offline snapshot.
- Physical VoiceOver, broader accessibility and existing security/manual gates
  retain their prior status. This session does not approve public distribution.

## Conditional merge order

PR #13 targets integration. PR #14 targets PR #13's branch to isolate its diff.
When remaining gates are reviewed and the owner approves: merge #13 first using
a merge commit, verify integration, then retarget #14 to integration, review its
reduced diff, rerun required CI and merge only after separate approval. Do not
merge #14 first, force-push, delete branches or infer merge authorization from
these test reports. Both PRs remain drafts pending review of outstanding gates.
