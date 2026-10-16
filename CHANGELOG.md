# Changelog

## Unreleased — proposed 0.1.0-beta.1

This is a release candidate plan, not a published release.

### Added
- Read-only, commit-pinned GitHub Actions checks for integration PRs: frontend types/tests/web build and Java 21/PostgreSQL tests/backend packaging.
- Private HTTPS browser CI using the existing nine scenarios, enabled Chromium sandboxing and temporary browser-only certificate trust.
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
- Manual screen reader, full focus management, visual/zoom and physical iOS/Android verification remain outstanding.
- No public deployment, production tag or GitHub release is created.
