# Controlled beta release readiness

**Deferred public-distribution roadmap (October 20, 2026):** active work targets
the owner's free-signed iPhone only; see PERSONAL-IPHONE.md. TestFlight, App Store,
public hosting/web and Android distribution are not active requirements. Preserve
the evidence below; security and personal-data safeguards still apply.

Preparation only: no deployment, publication, tag, or automatic merge is performed.

## Automated checks

`.github/workflows/ci.yml` runs on PRs targeting `integration`, pushes to `integration`, and manual dispatch. Stable job names are **Frontend checks**, **Backend checks** and **Private HTTPS browser checks**. After the first successful hosted run, an administrator should require all three checks in the `integration` branch rules. Branch protections are not changed here.

Frontend uses Node 22, pnpm 10.18.3, frozen lockfile installation, TypeScript, unit tests, and the production Expo web export. Backend uses Temurin Java 21 and Maven `clean verify` for compilation, tests, and Spring Boot packaging. Existing integration tests start disposable PostgreSQL 17 Testcontainers on the ephemeral hosted runner; no private staging database is used. Docker failure fails the job rather than skipping database tests. Maven's enforcer checks Java/Maven versions.

Actions use verified full commit hashes with release comments. Jobs have read-only repository access, no persisted checkout credentials, no repository secrets, no deployment credentials, and no artifact uploads. Dependency install scripts and tests execute contributed code: keep these jobs on disposable hosted runners, never privileged staging runners. Do not use `pull_request_target`. pnpm package-store and Maven dependency caches use lockfile/POM keys and GitHub ref isolation; no secrets or built application outputs are cached, and caches are not consumed by privileged jobs.

Review official release notes and advisories before updating action hashes. Rerun all jobs after updates. Use only synthetic test fixtures; never log real credentials or upload environment files, dumps, screenshots, traces or credential files.

## Release gates

1. Review the exact candidate and a successful hosted CI run for its PR merge candidate. Local success does not prove GitHub Actions executed.
2. Preserve `frontend` and `backend`. Merge into `integration` only with explicit approval; retain candidate commit and image digests.
3. Run all nine browser scenarios against disposable private HTTPS staging. Historical success does not certify later changes. Preserve TLS verification and Chromium sandboxing; follow the approved isolated trust process in `LOCAL-HTTPS.md`. Do not modify macOS trust automatically.
4. Complete the manual matrix in `BETA-TESTING.md`: responsive visual review, keyboard/focus, screen readers, contrast, zoom/reflow, reduced motion and physical devices. Unexecuted checks remain **Not Tested** and are public-release gates.
5. Recheck vulnerabilities for exact candidate images. Revalidate certificate validity, tester restrictions, private bindings, secrets permissions, migrations, backup restoration and rollback using `PRIVATE-STAGING.md` and `STAGING.md`. Never expose PostgreSQL or print secrets.
6. Confirm content preservation and mode isolation. Local storage is browser-specific; account mode needs the backend. Account offline synchronization and guaranteed cold offline loading are not implemented.
7. Obtain explicit approval before planning a deployment or publishing a release. CI does not provision infrastructure, deploy, purchase services, or publish packages/releases.

## Verification record

Base: `af922352531da0669d8de60a29b75ec862cd0e17` (`integration`, PR #7 merged).

Record local and hosted results separately in `TESTING.md`; pending checks are not passed. CI changes do not modify application UI, persistence keys, schema, APIs, or stored content.

## Versioning

Proposed first controlled beta: **0.1.0-beta.1**, following [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Use increasing `beta.2`, `beta.3` prereleases for candidate changes; final `0.1.0` follows completion of release gates and separate approval. Record the exact Git SHA, image digests and migration versions per candidate. Do not reuse a published version/tag or move an existing tag. No tag or release exists as a result of this work.

Current Expo/npm version `0.1.0` and Maven development version `0.1.0-SNAPSHOT` are retained for existing build compatibility. Before an approved release, align package version to `0.1.0-beta.1`, Maven version and Docker artifact path together, and keep native numeric build identifiers separate. Do not rename the executable JAR without updating its Docker COPY path. The proposed release identifier is documented, not falsely represented as a published artifact.

See CHANGELOG.md, RELEASE-CHECKLIST.md, RELEASE-SECURITY.md and RELEASE-OPERATIONS.md. Two unresolved high dependency advisories currently block release.

## Hosted browser isolation

The nine existing scenarios run on a disposable Ubuntu 22.04 hosted runner without host security-policy changes. A unique local-only Compose project builds the three existing images, generates a fresh seven-day test CA and synthetic tester credential, and validates service health, network isolation and TLS protections. Sandboxed non-root Chromium must reject the CA before trust; a full SHA-256 fingerprint and self-signature are checked before importing into a fresh NSS database under a temporary browser HOME. The normal runner NSS database and both macOS keychains are untouched. Only this process tree uses temporary trust; removal is followed by a fresh-browser rejection check.

The browser executable cache path stays separate from browser HOME. No SSL-ignore flags, privileged browser containers, new Linux capabilities, public listener or screenshots/traces are used. Only scenario titles/status/counts are logged. A finally block removes temporary trust, secrets and the uniquely owned test stack/volume; ephemeral hosted-runner disposal handles forced termination. CI never accesses the existing operator staging project. Candidate backup/restoration and restart checks use only that fresh stack.
