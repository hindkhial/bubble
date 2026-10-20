# Documentation

Bubble is maintained as a personal iPhone application. Start with the current
guides below. Older records are retained with their dates and original evidence;
a later test result supersedes an earlier pending result only for the exact
scenario and build that was actually tested.

Commands are run from the repository root unless a guide says otherwise.
Machine-specific paths should be replaced with your own checkout location.

## Personal iPhone use

| Guide | Covers |
| --- | --- |
| [Personal iPhone setup](PERSONAL-IPHONE.md) | Xcode installation, free signing renewal, backend availability and data precautions |
| [Native accounts](IOS-ACCOUNTS.md) | Authentication, account isolation, content and photo storage |
| [Offline protection](OFFLINE-ACCOUNT-PROTECTION.md) | Seven-day policy, local unlock, encryption and protected drafts |
| [Physical offline verification](IOS-OFFLINE-VERIFICATION.md) | Owner-executed passes, inconclusive network attribution and unexecuted checks |

## Development and architecture

- [Frontend/backend integration](INTEGRATION.md)
- [Native iOS foundation](IOS-NATIVE.md)
- [iOS interface and standalone-build notes](IOS-UX-POLISH.md)
- [Performance measurements](PERFORMANCE.md)
- [Backend development](../backend/README.md)

## Testing

- [Test commands and chronological results](TESTING.md)
- [Simulator verification](IOS-SIMULATOR-TESTING.md)
- [Physical-device checklist](IOS-DEVICE-TESTING.md)
- [Manual accessibility and layout checks](MANUAL-QA.md)
- [Private beta testing process](BETA-TESTING.md)
- [Candidate verification record](RELEASE-CANDIDATE-QA.md)

The core offline iPhone workflows have owner-reported passes. Physical traffic
attribution remains inconclusive. Actual seven-day expiry, reboot, induced
rejection/account switching, key-corruption recovery and broader accessibility
checks retain their recorded status. Do not change clocks, remove keys or restore
over personal data to complete a checklist.

## Security and private operations

- [Security reporting](../SECURITY.md)
- [Dependency risk assessments](DEPENDENCY-RISKS.md)
- [Security review](RELEASE-SECURITY.md)
- [Local HTTPS and trust scope](LOCAL-HTTPS.md)
- [Private staging setup, backups and recovery](STAGING.md)
- [Private staging verification](PRIVATE-STAGING.md)
- [Operational procedures](RELEASE-OPERATIONS.md)

Keep secrets and private account content outside Git. A saved app container does
not include device-only Keychain keys or establish complete recovery. Certificate,
trust, firewall and signing changes require their own explicit approval.

## Retained planning and implementation records

- [Authentication/profile interface record](AUTH-PROFILE.md)
- [Release-readiness record](RELEASE-READINESS.md)
- [Release checklist](RELEASE-CHECKLIST.md)
- [Changelog](../CHANGELOG.md)

Public hosting, App Store, TestFlight and Android distribution are deferred.
Their previous preparation documents are reference material, not an active
deployment plan or release approval.
