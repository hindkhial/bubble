# Changelog

## Unreleased — proposed 0.1.0-beta.1

The version remains proposed; no release or tag has been published. Current
scope is personal iPhone installation with free Xcode Personal Team signing.

### Added
- Native iPhone storage and account integration, Bubble/photo collections, profile customization and light/dark accent themes.
- Account-specific encrypted read-only snapshots with a seven-day online-verification bound and Face ID/device-passcode unlock at launch and every foreground return.
- Protected note/checklist drafts with explicit recovery review and new-copy publication; uncertain publication is retained without automatic retries.
- Personal iPhone installation, signing renewal and data-safety guidance, plus a separate record of owner-executed offline verification.
- Read-only, commit-pinned GitHub Actions checks for integration PRs: frontend types/tests/web build and Java 21/PostgreSQL tests/backend packaging.
- Private HTTPS browser CI using all eleven scenarios, enabled Chromium sandboxing and temporary browser-only certificate trust.
- Release checklist, security findings, versioning and private operations guidance.
- Final-candidate image scanning in CI with a restricted non-root scanner, compatible artifact rollback drill and a detailed manual QA checklist.

### Security
- Pin pnpm 10.18.3 and override shell-quote to 1.11.0 and source-map-js to 1.2.2; add a shell-quoting regression test.
- Update web-exposed decode-uri-component to fixed 0.5.0 with a tracked CommonJS packaging-only patch and real query-parser regressions.
- Track unresolved dependency advisories as release blockers rather than suppressing them.

### Existing beta functionality retained
- Notes, checklists, search, pinning, editable profile and appearance themes/accents.
- Separate browser-local and account workspaces, secure sessions/CSRF and PostgreSQL persistence.

### Release constraints
- Core iPhone offline/unlock/draft/logout workflows have owner-reported passes; physical network attribution is inconclusive. Actual seven-day expiry, reboot, induced rejection/account switching and complete recovery remain unexecuted on-device.
- Manual screen reader, full focus management and visual/zoom checks remain outstanding. Android and public distribution are deferred.
- No public deployment, production tag or GitHub release is created.

### Documentation
- Present the complete application on the integration default branch, with an iPhone-first README and a documentation index under docs/.
- Retain historical testing and security evidence while removing tool-specific wording and machine-specific checkout paths.
