# Release security review

Reviewed 2026-10-16. Point-in-time evidence; not an assurance of unknown-vulnerability absence. No secrets, host trust, account data, backend behavior or deployment permissions were changed.

## Dependency findings

Initial pnpm audit: one critical, three high and two moderate advisories. After the two compatible targeted overrides: **zero critical, two high, two moderate**. No audit exclusions or severity downgrades were added.

| Dependency | Finding | Decision |
| --- | --- | --- |
| shell-quote, React Native devtools chain | Critical GHSA-pqg4-j6r4-53mv | Fixed 1.10.0 → 1.11.0; executable regression verifies rejection of newline tokens after comments without executing shell input |
| source-map-js, Expo/PostCSS chain | High GHSA-68fv-2mgg-jv7q | Fixed 1.2.1 → 1.2.2 |
| node-forge 1.4.0, Expo CLI/certificate tooling | High GHSA-86w9-cpqp-85rv | **Release blocker**: advisory reports no patched version; do not claim exploitability absent or silently accept risk |
| braces 3.0.3, Expo/Metro micromatch chain | High GHSA-vfj7-8cjw-p6xm | **Release blocker**: advisory reports no patched version; obtain a compatible upstream fix or separately reviewed removal |
| uuid 7.0.3 via xcode | Moderate GHSA-w5hq-g745-h8pq | Outstanding; do not force a major-version transitive upgrade without native-tooling verification |
| decode-uri-component 0.4.2 via query-string | Moderate GHSA-vcc3-ghjq-m6fr | Outstanding; review compatible query-string/decoder update before release |

These paths include development/build tooling; runtime reachability is not established for every finding. Dependency audit coverage still applies: do not equate clean runtime images with a clean toolchain. Follow the [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Rerun `pnpm audit --json` with the exact lockfile before release; nonzero results must be investigated.

## Containers and backend

Fresh digest-pinned Trivy scanning of the existing three private staging runtime images found zero vulnerabilities at all reported severities, including OS and backend JAR coverage. Report-to-running-image identity was verified. This scan predates the new frontend build-tool dependency overrides; rebuild/rescan the final candidate rather than transferring that result to new images. Raw reports/identities remain outside Git; scanner gets exported archives, no Docker socket or secrets.

Reviewed secure HttpOnly SameSite cookies, CSRF enforcement, exact CORS, login rate limiting, session fixation protection, ownership authorization, generic error responses, production safety validation, disabled SQL parameter logs and Flyway clean protection. Backend tests include authentication, cross-account access, CSRF, invalid inputs and deployment configuration. Database/backend publish no host ports; private Nginx is loopback-only and tester-gated. No backend service or keychain settings were relaxed.

## CI, credentials and logs

Only `contents: read`; no secrets, publishing or deployment credentials. Full action SHAs are verified against official release commits. Checkout does not persist credentials. Untrusted PR code runs on disposable hosted runners, never against operator staging; no `pull_request_target` or privileged browser container. Caches contain only public pnpm packages or Maven repository artifacts, scoped by lockfile/POM and [GitHub ref isolation](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache); no broad restore keys. Do not consume PR-built outputs/caches in a later privileged release job.

Targeted tracked-file scan found no private-key or common GitHub/AWS token patterns; only placeholder env examples are tracked. This is not a complete historical secret audit. Browser CI generates unique synthetic credentials, keeps them outside the checkout, prints only safe scenario summaries, disables traces/screenshots and uploads no reports. Temporary root trust is confined to a fresh NSS database for sandboxed Chromium on a disposable Linux runner; default runner NSS and macOS keychains are untouched. Verify TLS rejection before import and after removal. Resource cleanup runs in finally; hosted-runner disposal is the cancellation/timeout backstop.

Release remains blocked by unresolved high advisories and outstanding human checks even if all automated CI jobs are green.
