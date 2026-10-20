# Private staging operations

This prepares a **local, private** staging environment. It does not authorize external hosting or a public release. Use fictional accounts and generated notes only. The original `frontend` and `backend` branches are preserved; preparation starts from integration merge `4ad0f3f`.

## Architecture and boundaries

Browser → `https://localhost:8443` → non-root Nginx → static Expo SPA and `/api/` → non-root Java 21/Spring Boot → PostgreSQL 17. The frontend and API share an origin, preserving credential cookies and existing CSRF behavior. Expo embeds the API origin at build time; changing it requires rebuilding the web image. `EXPO_PUBLIC_*` values are public, never secrets.

The published HTTPS server requires a separate tester password for **all** frontend/assets/API routes. This Nginx gate does not replace Bubble's account login or CSRF protection, and its Authorization header is stripped before proxying. Internal health checks remain available only inside the containers. Do not remove the gate or expose an ungated older web image during rollback. App logout clears the Bubble session, not the browser's cached tester credentials; close the dedicated browser profile when finished. Revoke a tester by removing its bcrypt entry and recreating the web container.

Only Nginx publishes a port, bound to **127.0.0.1**. PostgreSQL and Java have no host ports. Their Compose network is internal, with subnet `172.30.87.0/24`; only Nginx has fixed address `172.30.87.10`. Nginx additionally joins a normal edge bridge so Docker can forward the loopback port; neither PostgreSQL nor Java joins that bridge. Tomcat trusts forwarded headers from Nginx's exact internal address. Nginx overwrites incoming forwarded headers instead of trusting client-supplied values. If this subnet conflicts with an existing network, change the subnet, Nginx address and both deployed profiles' `internal-proxies` together, then rerun checks. Do not broaden trust or expose the backend directly.

The provided files do not provision a production environment. `local`, `staging`, and `prod` profiles are separate. `local` keeps existing HTTP development behavior. Deployed profiles reject mixing with `local`, insecure cookies/origins, automatic Hibernate DDL, disabled Flyway validation/clean protection, SQL output or verbose client errors. Never deploy with the default local profile.

## Prerequisites and protected configuration

For a **new** local setup, Node.js, OpenSSL and a bcrypt-capable Apache `htpasswd` utility can create the protected files without printing credentials:

```sh
node scripts/prepare-private-staging.mjs /absolute/protected/bubble-staging
export STAGING_ENV_FILE=/absolute/protected/bubble-staging/staging.env
```

The parent directory must already exist. The helper refuses existing destinations and paths inside the repository. It generates independent database/tester passwords, a bcrypt tester file, an owner-only tester credential JSON file, and a seven-day local CA/server certificate. It does **not** install trust, configure external hosting or launch services. Before browser use, manually trust only `ca.crt` in an isolated test browser/profile according to local policy; never share `ca.key`. Renew the test certificate before its seven-day expiry. CLI checks explicitly trust `ca.crt` without disabling TLS verification.

For an existing setup, preserve its project name, database volume and password files. Add a protected bcrypt file using interactive `htpasswd -B` and set `TESTER_PASSWORD_FILE` in its existing environment file; do not regenerate database passwords or reset the volume. Add/retain the separate `DB_IMAGE_TAG` for the reviewed PostgreSQL 17 derivative. Back up before recreating containers. File-backed secrets may require container recreation after file replacement; verify revocation/rotation rather than assuming a bind mount changed.

Docker Engine/Desktop with Compose v2+; adequate image-build disk/memory; Java 21/Maven and Node 22.6+/pnpm for host checks. Base/PostgreSQL images are pinned to the digests used in verification. Before a remotely hosted staging release, scan the final images, review fixes, and record their digests; dependency repositories/build tools still prevent a bit-for-bit reproducibility guarantee. Update pins deliberately through a reviewed change. Keep the built release images; do not reuse a release tag for different code. There is no automatic registry push, cloud infrastructure, deployment workflow or telemetry service.

Create a protected directory **outside the repository**. Generate separate random application and PostgreSQL bootstrap password files, without printing their contents. Example (run locally, replace the directory):

```sh
mkdir -p /absolute/protected/bubble-staging
chmod 700 /absolute/protected/bubble-staging
openssl rand -hex 32 > /absolute/protected/bubble-staging/postgres-password
openssl rand -hex 32 > /absolute/protected/bubble-staging/app-password
```

Supply a TLS certificate valid for `localhost` and its private key there. Use a locally trusted CA/certificate for browser verification; install trust yourself according to your organization's policy. Do not bypass certificate warnings, disable cookie security or use `curl -k`. Command-line tests may explicitly trust a dedicated test CA with `curl --cacert` or `NODE_EXTRA_CA_CERTS`; this does not install system trust. Never commit keys, certificates with private keys, passwords, dumps or traces.

Compose file secrets are local read-only mounts, **not an encrypted secret store**. The source files must be readable by container UIDs 10001 (backend), 101 (Nginx), and the PostgreSQL entrypoint. File-backed Compose secrets do not portably remap source ownership/mode. For local Docker Desktop, a 0700 protected parent directory with 0444 files permits container reads while restricting host traversal. On Linux, use appropriate ACLs/ownership instead, and verify access without printing contents. Protect the Docker daemon and host; anyone controlling Docker can read secrets. Do not place secret values on a command line or in Compose environment values.

Copy `deploy/staging/.env.example` to ignored `deploy/staging/.env`, replace absolute paths, and set a unique `RELEASE_TAG` (for example, the reviewed Git SHA). Paths must be absolute. The helper accepts `STAGING_ENV_FILE` for a configuration file elsewhere and `STAGING_PROJECT` for a separate stack/volume.

| Variable | Purpose |
| --- | --- |
| `RELEASE_TAG` | Local backend/web image release tag; preserve the previous images for rollback. |
| `DB_IMAGE_TAG` | Independently retained PostgreSQL 17 image tag; do not change it during an app-only rollback. |
| `STAGING_ORIGIN` | Exact HTTPS origin with no path/trailing slash; local recipe uses `https://localhost:8443`. Used for CORS and frontend build. |
| `POSTGRES_PASSWORD_FILE` | Protected bootstrap administrator password file. |
| `DB_PASSWORD_FILE` | Separate protected application-role password file. |
| `TLS_CERT_FILE`, `TLS_KEY_FILE` | Protected certificate chain and private key, matching the origin. |
| `TESTER_PASSWORD_FILE` | Protected bcrypt htpasswd file for the authorized tester gate. |
| `STAGING_ENV_FILE`, `STAGING_PROJECT` | Optional helper overrides; project defaults to `bubble-private-staging`. |

Compose fixes `SPRING_PROFILES_ACTIVE=staging`, `DB_URL=jdbc:postgresql://db:5432/bubble_staging`, `DB_USERNAME=bubble_app`, and the exact `CORS_ALLOWED_ORIGINS`. Spring imports `DB_PASSWORD` from `/run/secrets/DB_PASSWORD`. Direct JAR operation instead requires exporting `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`, and explicitly selecting `staging`. Never add credentials to a JDBC URL. Database traffic stays inside this single-host private network; use verified database TLS if moving it across hosts.

## Build and local startup

From the repository root, after reviewing the local configuration:

```sh
sh deploy/staging/compose.sh config --quiet
sh deploy/staging/compose.sh build
sh deploy/staging/compose.sh up -d --wait --wait-timeout 180
sh deploy/staging/compose.sh ps
node scripts/verify-private-staging.mjs
# Run the protected smoke check below; unauthenticated HTTPS health returns 401.
```

The scripts deliberately run through `sh`; no executable-bit setup is required. Build stages install pinned frontend dependencies from the lockfile and package Maven for Java 21. Container builds skip test execution, so run the tests below separately before accepting an image. Runtime filesystems are read-only except temporary files; app containers drop capabilities, disallow privilege escalation and run as non-root. PostgreSQL uses its image's standard unprivileged database process and a dedicated named volume. Docker restart policy is `unless-stopped`; unhealthy state does not automatically restart a still-running process.

The database init script runs **only on a new empty volume**. It creates the non-superuser `bubble_app` role and `bubble_staging` database. The app role owns its own schema so Flyway can migrate it; it cannot create other roles/databases. PostgreSQL initialization uses a separate administrator secret. Changing a password file later does not rotate existing database passwords: plan a coordinated role/password rotation and restart; never reset the volume to rotate credentials.

Flyway validates/applies existing forward migrations at application startup. Hibernate only validates. Flyway clean is disabled. No migration or schema change is added by this preparation. Back up before future migrations; review SQL/locks/data compatibility first. Do not enable `ddl-auto=create/update`, baseline an unexpected schema, edit applied migrations, or auto-run Flyway repair to hide a mismatch.

Nginx waits for Java health; Java waits for PostgreSQL health. `/api/v1/health` is a minimal liveness response (`status`, `application`), without versions/credentials/database detail; it does not prove continuing database readiness. Startup/migration failures prevent Java health from passing. Verify a real authenticated synthetic read/write after start. The internal-only `/healthz` checks Nginx without bypassing TLS on the published port.

## Frontend and security verification

SPA detail routes fall back to `index.html`; missing asset URLs return 404. All frontend/API responses use `no-store` caching for this conservative private setup. No service worker or cloud cache is added. CSP permits Expo's inline styles but no inline scripts; verify actual browser rendering before release. Local-only functionality and existing storage keys are untouched. A new origin has separate localStorage: do not expect localhost:8082 content to appear on HTTPS:8443, and never clear or silently migrate a user's old origin. Photo data URLs remain local. Account API failures retain existing draft/error handling.

Cookies stay Secure, HttpOnly, SameSite=Lax; HTTPS is mandatory. Credentialed CORS allows only the explicit HTTPS origin, with existing CSRF tokens on mutations. Same-origin hosting avoids third-party cookie dependence. Request URLs/bodies are not access-logged: Nginx logs critical errors only because request error logs can contain private search URLs; application SQL/bind logging and verbose HTTP errors remain disabled. Restrict operational logs and retention (Compose caps each service at three 10 MB files). Health/metrics, OS/container monitoring and restricted diagnostics should supplement these deliberately minimal logs. Do not enable DEBUG or publish traces containing credentials/content.

HSTS is intentionally not enabled for localhost: Nginx suppresses the backend's default HSTS header so this test environment cannot force unrelated localhost development apps onto HTTPS. TLS and Secure cookies remain mandatory on the published staging port. A remotely hosted environment must have a reviewed domain/TLS/access-control plan (including suitable HSTS), VPN or equivalent private access, firewall rules and explicit approval. **Do not change the loopback binding to 0.0.0.0 to make it accessible.** Authentication is application-level, not a replacement for private staging network access.

```sh
pnpm test
pnpm typecheck
pnpm build:web
(cd backend && mvn verify)
export BUBBLE_TEST_API_URL=https://localhost:8443
export BUBBLE_TEST_ORIGIN=https://localhost:8443
export BUBBLE_TEST_AUTH_FILE=/absolute/protected/bubble-staging/tester-credentials.json
export NODE_EXTRA_CA_CERTS=/absolute/protected/bubble-staging/ca.crt
node scripts/staging-smoke.mjs
pnpm test:account-live
```

Tester credentials are read only from an absolute owner-only JSON file (`username`, `password`). They are never embedded in the frontend, URL, command arguments or Compose environment. For hand-created tester entries, create this client JSON outside Git with mode 0600. The test helper rejects credentials sent to HTTP or non-local origins. A browser tester may read the protected file locally and enter the credentials at the HTTPS prompt; do not paste them into chats/issues. Keep tester accounts separate from Bubble accounts, and give each tester its own password entry when adding people.

For repeatable synthetic session/restart checks on the disposable staging database:

```sh
export BUBBLE_E2E_DISPOSABLE=1
export BUBBLE_TEST_STATE_FILE=/absolute/protected/bubble-staging/lifecycle.json
node --experimental-strip-types scripts/staging-lifecycle.mjs seed
node --experimental-strip-types scripts/staging-lifecycle.mjs session
sh deploy/staging/compose.sh restart
sh deploy/staging/compose.sh up -d --no-build --wait --wait-timeout 180
node --experimental-strip-types scripts/staging-lifecycle.mjs restart
```

`seed` refuses to overwrite an existing state file and leaves only its own fictional account/note/checklist. State includes synthetic credentials/cookies and must remain outside Git. `session` verifies a fresh client can resume the saved session. `restart` expects the old in-memory session to be rejected, signs the fixture account in again and compares persisted content/profile/preferences exactly. These are API/client checks, not browser UI coverage.

To scan final local images, use a **new** report directory outside Git:

```sh
node scripts/scan-private-staging.mjs /absolute/protected/reports/new-release
```

The parent report directory must exist. The script exports only the three local runtime images, runs digest-pinned Trivy with telemetry disabled, and records image IDs, timestamps, severity counts and raw JSON reports. The scanner receives image archives and its dedicated public vulnerability-database cache volume, never the Docker socket or staging secrets. Critical/high findings exit nonzero; lower findings still require review. A download/scanner failure is not a clean result. Docker Scout is an alternative after operator login; it was unavailable without login here. Scans are point-in-time evidence, not protection from unknown vulnerabilities.

The scanner expects Docker's OCI archive format (verified with Engine 29.8.2) and a host `tar` utility. It distinguishes index, platform-manifest and image-config digests, checks that a running service belongs to the scanned archive, and requires OS package analysis plus Java analysis for the backend. Unsupported archives or identity/coverage mismatch fail closed. `verify-private-staging.mjs` separately checks healthy non-root processes, read-only secrets, owner-only secret parents, restricted database role and actual host/network bindings; it probes only this host's own non-loopback IPv4 addresses, never an external target.

Use the last two commands only against a disposable local test stack: the account check creates a fictional account and generated content, cleans up its content and leaves its fictional account. The TLS smoke checks routing, no-store/CSP, minimal health, cookies, CSRF and denied origins; it is not browser verification. No lint command currently exists. See [TESTING.md](TESTING.md) for the eight still-unverified Playwright scenarios and the manual checklist. Full browser verification is required before public release, even though integration accepted this documented limitation.

## Backup, restoration and recovery

Before each release/migration, create a new protected custom-format dump:

```sh
sh deploy/staging/backup.sh /absolute/protected/backups/bubble-before-release.dump
sh deploy/staging/compose.sh exec -T db pg_restore --list < /absolute/protected/backups/bubble-before-release.dump > /absolute/protected/backups/bubble-before-release.contents
```

The helper refuses an existing backup path. Backups contain private data: protect/encrypt the backup filesystem, define a retention policy, copy to approved protected storage, and test restoration. They include Flyway history and application tables, not cluster roles, password files or TLS keys. Retain those secrets separately in approved protected storage. Never commit staging fixtures/dumps or use a production dump. Dump only trusted databases; restoration executes SQL from the dump.

Practice restoration into a **new, empty recovery database** in isolated staging, leaving the original database untouched:

```sh
sh deploy/staging/compose.sh exec -T db createdb -U postgres --owner=bubble_app bubble_recovery
sh deploy/staging/compose.sh exec -T db pg_restore -U postgres --role=bubble_app --no-owner --no-acl --exit-on-error --single-transaction --dbname=bubble_recovery < /absolute/protected/backups/bubble-before-release.dump
sh deploy/staging/compose.sh exec -T db psql -U postgres -d bubble_recovery -c 'SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;'
```

Compare synthetic row counts and exact note/checklist/profile/preferences values. A repeated restore must use another new database, not overwrite the old one. To serve the restored database, stop web/backend, explicitly change **only the staging** `DB_URL` to `bubble_recovery`, choose an image compatible with that dump's Flyway history, then recreate backend/web and verify health plus authenticated checks. The original database remains for investigation. A PostgreSQL major upgrade needs its own tested dump/restore or pg_upgrade plan; changing an image tag against the existing volume is not an upgrade procedure.

Use a protected, external Compose override instead of editing the tracked base file:

```yaml
services:
  backend:
    environment:
      DB_URL: jdbc:postgresql://db:5432/bubble_recovery
```

Run `sh deploy/staging/compose.sh -f /absolute/protected/recovery.compose.yml up -d --no-build --wait --wait-timeout 180`, then the synthetic `restart` check. Nginx's Docker DNS resolver follows replacement backends without keeping a stale startup address. To return to the untouched source database, run the same `up` command without the override and repeat checks. This recovery was tested against a healthy source plus a separately restored database. If the source database is missing/unavailable, the database service's application SQL health probe must also be explicitly pointed at the recovered database in the override; otherwise it still probes `bubble_staging`. Diagnose a failing health check rather than removing it or resetting the volume.

## Release rollback and safe shutdown

Record Git SHA, release image IDs/digests, configuration paths (not values), migration versions and verified backup location before changing anything. If a release fails: keep web/backend stopped, preserve the database volume/logs/images, inspect minimal health and migration failures, fix configuration and retry only after diagnosis. Do not reset data, blindly repair Flyway or automatically retry migrations with edited SQL.

For an app-only rollback **only when the old application is compatible with the current schema**, stop web/backend, set `RELEASE_TAG` to the retained old release, and recreate from its existing images without rebuilding:

```sh
sh deploy/staging/compose.sh stop web backend
# Edit RELEASE_TAG in the protected staging configuration to the retained release.
sh deploy/staging/compose.sh up -d --no-build --wait --wait-timeout 180
```

Do not change/recreate the database volume during app rollback. If a migration removed/renamed columns, changed data semantics, or a newer Flyway history is incompatible with the old app, **do not downgrade automatically**. Prefer a reviewed forward fix; otherwise restore the pre-release dump into a new isolated database and use the matching app image after explicitly accepting loss of writes since that backup. Never automatically reverse a destructive migration.

Also retain `DB_IMAGE_TAG` unchanged and require the rollback web artifact to keep the tester gate. Re-run the TLS/gate smoke check and fixture `restart` check after each release switch. The recorded rehearsal uses distinct metadata-labelled candidate images of the same application/schema, then retained compatible artifacts; it proves container/image switching, session invalidation and data preservation, not compatibility with an arbitrary historical or destructive schema change. See [PRIVATE-STAGING.md](PRIVATE-STAGING.md) for the actual run and outstanding gates.

```sh
sh deploy/staging/compose.sh stop
# Optional removal of containers/network while preserving the named database volume:
sh deploy/staging/compose.sh down
```

Java handles SIGTERM with a 20-second graceful phase; Compose allows 30 seconds. Sessions are in-memory: backend restart signs account users out, but does not erase their persisted content. There is no zero-downtime guarantee, session replication, offline account sync or installable offline shell. **Never use `down -v`, prune volumes, or change the project name to “fix” existing staging data.** An intentionally disposable automated fixture stack can remove only its own confirmed test volume after verification.

## References

The PostgreSQL runtime derives from the pinned official image but uses Alpine `su-exec` instead of its bundled Go-based `gosu`. The pinned entrypoint's single privilege-drop call is checked before replacement; the database still drops root privileges. This removes inherited vulnerable Go standard-library code rather than suppressing scanner findings. Runtime zlib/libpng packages have explicit minimum patched versions. Rebuild and rescan all three final images after base/package updates; changing these helpers does not change PostgreSQL's major version or migrate data.

Implementation follows [Compose health/start ordering](https://docs.docker.com/compose/how-tos/startup-order/), [file-backed secrets](https://docs.docker.com/reference/compose-file/secrets/), [Expo web export/SPA behavior](https://docs.expo.dev/guides/publishing-websites/), [Nginx proxy header controls](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), and [PostgreSQL 17 restore tooling](https://www.postgresql.org/docs/17/app-pgrestore.html). These controls require the runtime checks above; they do not certify a public deployment.
