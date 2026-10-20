# Security

Bubble is currently maintained for personal iPhone use. Public distribution and
hosting are deferred. Passing CI is separate from approval of the outstanding
security and manual-device checks.

## Reporting an issue

Contact the repository owner privately before sharing sensitive details. If no
private contact channel has been agreed, open an issue asking for one without
describing an exploitable vulnerability or including private data.

Never put passwords, session cookies, encryption keys, certificate private keys,
database dumps, personal notes/photos or unredacted network traces in a public
issue or pull request. Use synthetic examples for reproducible reports.

## Current assessments

- [Dependency findings and applicability](docs/DEPENDENCY-RISKS.md)
- [Security review and outstanding gates](docs/RELEASE-SECURITY.md)
- [Native offline account policy](docs/OFFLINE-ACCOUNT-PROTECTION.md)
- [Physical iPhone verification](docs/IOS-OFFLINE-VERIFICATION.md)

Offline access cannot detect remote revocation immediately and is bounded to
seven days after successful online verification. Device-only key loss can make
unsynced drafts unrecoverable. Complete backup restoration and some physical
security tests remain unverified. Existing findings are not suppressed by a
documentation cleanup or a successful runtime-image scan.

Do not bypass TLS warnings or change authentication, signing, certificate trust,
firewall rules, stored keys or personal data as a testing shortcut.
