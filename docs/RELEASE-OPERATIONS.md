# Private beta operations

This runbook does not authorize a deployment or a change to existing operator secrets/data. Use synthetic fixtures for drills. Record the candidate SHA, image digests, migration history, protected backup location, operator and timestamps without secret values.

## Startup, health and shutdown

Use STAGING.md's existing setup and owner-only external environment file. Set `STAGING_ENV_FILE` and retain the existing `STAGING_PROJECT` name for an existing database. Run `sh deploy/staging/compose.sh config --quiet`, then `up -d --no-build --wait --wait-timeout 240` only with retained, reviewed images. Building or changing images is a separate reviewed step. Verify all service health checks and `node scripts/verify-private-staging.mjs`; run the TLS/gate smoke with an explicitly trusted test CA and protected tester credential file as documented in LOCAL-HTTPS.md. Never use insecure TLS flags.

Expected: only 127.0.0.1:8443 is published; unauthorized routes/API return 401, authorized minimal health is UP; PostgreSQL and backend have no host bindings. Do not publish 5432 or 8080. Flyway V1–V3 must succeed and validate on restart; Hibernate validates schema. Investigate failed migrations without editing applied SQL, calling Flyway clean/repair, or resetting volumes.

Shutdown: `sh deploy/staging/compose.sh stop`. Optional `down` removes containers/network while preserving the data volume. Never use `down -v` for operator staging. The CI runner owns a unique fresh `bubble-ci-*` project and deletes only that disposable volume after tests. Forced job termination relies on disposal of the hosted runner as a cleanup backstop.

## Backup, restore and rollback

Follow the full tested procedure in STAGING.md: create a new protected custom dump with `deploy/staging/backup.sh`, list it, restore transactionally into a **new** scratch database, compare all nine application/Flyway tables (users, profiles, notes, checklists, checklist_items, user_preferences, library_entries, library_placements and flyway_schema_history) and exact synthetic fixtures, and test a compatible backend against that restored database before accepting a recovery drill. Never restore over the source or expose the dump in CI artifacts. Encrypt off-machine backups using an approved process; retention/off-machine recovery is not implemented here.

Keep the database image tag and volume stable during app rollback. Retain the old web/backend artifacts and choose them only after checking compatibility with the current Flyway schema. Stop app services, select retained image tags in the protected external configuration, recreate without building, and rerun health/TLS/authenticated fixture checks. A destructive schema change requires a forward fix or a reviewed restore to a new database with explicit acceptance of post-backup write loss. Session invalidation on backend restart is expected; content must survive reauthentication.

The prior private rehearsal verified exact seven-table restore, recovered-backend operation, restart persistence and compatible app switching (PRIVATE-STAGING.md). It does not establish compatibility with arbitrary old releases. Repeat candidate-specific recovery before release; do not mark a documentation review as a new execution pass.

## Incident response

1. Restrict access: stop web/backend or remove the affected tester entry. Keep PostgreSQL private and preserve its volume; do not prune or overwrite evidence.
2. Record time, candidate/image identities, affected modes and minimal health. Restrict collected logs/dumps to the operator; redact credentials, cookies, emails and note content before sharing.
3. Determine whether exposure, data loss, integrity failure or service outage occurred. Snapshot/backup safely before corrective writes; keep the original database available for investigation.
4. Revoke affected tester credentials, account sessions and compromised keys. Restarting the backend invalidates its in-memory sessions. If account credentials may be compromised, coordinate a separately authorized reset; no admin reset feature is invented here.
5. Use a compatible retained artifact or forward fix. Restore only to a new database. Verify exact fixtures, mode isolation, health, TLS and permissions before allowing testers back.
6. Document scope, recovery actions, remaining risk and prevention. Obtain explicit approval before any wider access or public release.

## Secret rotation

Rotation is documented, not executed in this change. Plan a maintenance window and verified backup; do not print secrets into terminal output or command arguments.

- **Tester gate:** generate a fresh strong credential through protected input; update the external bcrypt file atomically, retain parent mode 0700/read-only container mount and reload/recreate Nginx. Confirm old credentials fail and new ones pass. Distribute only through an approved private channel.
- **Application database password:** coordinate the PostgreSQL role password and external DB_PASSWORD file while app services are stopped; file changes alone do not rotate an existing PostgreSQL role. Use protected SQL input, recreate backend, verify least-privilege login, and revoke old credentials. Keep the admin credential separate.
- **PostgreSQL admin password:** update the actual role and matching external bootstrap file through protected input. POSTGRES_PASSWORD_FILE initialization does not change an existing role. Verify backup/admin access and limit it to the private container.
- **TLS leaf/CA:** generate replacement material outside Git, verify full fingerprint/SAN/expiry, update external mounts and recreate Nginx. New CA trust requires explicit approval or a new isolated browser-test store; never import into host keychains automatically. Remove old test trust and revoke distribution of the old CA; destroy superseded private keys only after recovery requirements are met. The generated development CA expires after seven days.
- **Sessions:** restart backend to invalidate all current memory sessions; verify old cookies fail and content returns after login. This is not granular revocation or replicated session storage.

Do not claim rotation, backup retention, off-machine recovery, or incident rehearsals passed until actually executed and recorded.
