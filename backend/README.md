# Bubble backend — Milestones 01–02

Java 21 and Spring Boot 4.1.1, with Spring MVC, Jakarta Bean Validation, Maven, JUnit **5** and Mockito. Milestone 02 adds PostgreSQL, Flyway and JPA repositories. There is no authentication, notes/list API, frontend connection, or deployment. Actuator is intentionally omitted: the small public health endpoint is sufficient and no internal management endpoints are exposed.

## Requirements

- A Java **21 JDK**, with `JAVA_HOME` pointing to the JDK and `java` available on `PATH`.
- Maven **3.6.3+** (verified with 3.9.11).
- Access to Maven Central for the initial dependency download. Application startup now requires PostgreSQL. Integration tests use a disposable PostgreSQL container and require Docker (or the explicit disposable PostgreSQL option below).

The Maven Enforcer check requires Java 21. Spring Boot's current stable line supports Java 21; see [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html). JUnit Jupiter is explicitly pinned to 5.14.4 because this milestone requests JUnit 5, rather than Boot 4.1's JUnit 6 default. Integration tests use a real embedded server and JDK HTTP client without requiring a different JUnit version.

## Setup and run

From the repository checkout:

```sh
git switch backend
cd backend
java -version
mvn -version
mvn clean verify
# Start local PostgreSQL and export DB_* as documented below.
mvn spring-boot:run
```

Or start the packaged application:

```sh
mvn package
java -jar target/bubble-backend-0.1.0-SNAPSHOT.jar
```

Then:

```sh
curl -i http://localhost:8080/api/v1/health
```

Expected HTTP 200, `Content-Type: application/json` and exactly:

```json
{"status":"UP","application":"Bubble"}
```

Stop the foreground server with Ctrl-C. It requires PostgreSQL but does not require the frontend to be running.

## Configuration

Spring reads exported environment variables. `.env.example` is documentation, not automatically loaded. Actual `.env` files are ignored by the backend's `.gitignore`; do not commit secrets.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | HTTP port |
| `SPRING_PROFILES_ACTIVE` | `local` when omitted | Explicitly choose `local` or `prod` for development versus future production configuration |
| `CORS_ALLOWED_ORIGINS` | Local profile: `http://localhost:8081,http://127.0.0.1:8081`; other profiles: empty | Comma-separated, exact HTTP(S) origins, without paths, credentials, trailing slash or wildcards |
| `BUBBLE_MAX_REQUEST_BYTES` | `1048576` (1 MiB) | Maximum buffered request body, 1 byte–10 MiB; oversized fixed-length or chunked requests receive HTTP 413 |

Example:

```sh
export SPRING_PROFILES_ACTIVE=local
export SERVER_PORT=8080
export CORS_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
mvn spring-boot:run
```

Before any future production use, explicitly activate `prod` and set exact approved origins. CORS permits only GET for `/api/v1/**`, with Accept/Content-Type headers and no credentials. Spring handles OPTIONS preflights. No wildcard production origins are allowed. CORS is a browser policy, **not authentication**; clients such as curl can call the public health endpoint.

Request headers are limited to 16 KiB, form posts and Tomcat's request swallowing to 1 MiB, and multipart upload parsing is disabled. The body filter enforces its configured byte limit, including chunked bodies, for the current synchronous Servlet architecture. Streaming/asynchronous uploads are intentionally not supported yet. Framework client errors, validation failures and unexpected server failures have small sanitized JSON responses; stack traces and implementation messages are not sent to clients. Unexpected failures are logged server-side for diagnosis.

## Tests and quality checks

```sh
mvn compile
mvn test
mvn clean verify
```

`verify` includes compilation, Java/Maven version checks, JUnit 5 tests, packaging and Spring Boot executable-jar repackaging. No separate formatter/linter is configured. Tests start the app on an ephemeral port with the `test` profile and PostgreSQL, and validate startup, health JSON, CORS allow/deny behavior, bean validation, malformed JSON, sanitized 500s, 404/405 status preservation, request size limits and configuration validation. Fixture-only endpoints live in test sources and are absent from the production jar. Mockito supports the validation-exception response unit test; database conflicts also have a sanitized-response test.

## Structure

```text
backend/
  pom.xml
  .env.example
  src/main/java/com/bubble/
    BubbleApplication.java
    config/       # validated configuration, CORS, request body limits
    controller/   # public health endpoint
    dto/          # health and error response records
    exception/    # centralized exception handling
  src/main/resources/
    application.yml
    application-local.yml
  src/test/java/com/bubble/
    BackendIntegrationTest.java
    ConfigurationTest.java
    ExceptionHandlerTest.java
  src/test/resources/application-test.yml
```

Service and repository packages will be introduced when real business logic and persistence exist; there are no empty placeholder classes. The committed frontend tree is retained untouched as the shared starting snapshot. All backend changes are confined to `backend/` on the `backend` branch; do not merge into `frontend` automatically.

## Planned milestones

1. This foundation: application setup, health, validation and errors, CORS, tests.
2. Completed: PostgreSQL, Flyway schema migration and Spring Data JPA.
3. Spring Security and account/authentication design, then authenticated notes/lists APIs.
4. Frontend integration, ownership/privacy rules and a separately agreed synchronization model.

No password handling, JWTs, authentication server or cloud services are implemented here. Runtime hardening, authentication, rate limiting, TLS/deployment and asynchronous upload support remain future work; this milestone is a local foundation, not a production deployment.


## Milestone 02 — PostgreSQL and JPA

### Run PostgreSQL locally

Docker Desktop must be running. The local Compose service binds PostgreSQL only to loopback and retains data in a named volume. Choose credentials outside version control. For a fresh local database, for example:

```sh
cd backend
export DB_USERNAME=bubble_local
# Generate a local password; retain it securely for reuse with this database volume.
export DB_PASSWORD="$(openssl rand -hex 24)"
export DB_URL=jdbc:postgresql://localhost:5432/bubble
docker compose up -d --wait
mvn spring-boot:run
curl http://localhost:8080/api/v1/health
```

Do not regenerate the password when reconnecting to an existing volume: PostgreSQL initialization variables only apply to a new empty data directory. Supply that volume's existing password instead. Stop with `docker compose down`; **do not remove the volume** unless intentionally discarding its data. Docker's initialization role is intended for local development only. A separately designed least-privilege migration/runtime role setup is needed before production deployment.

`.env.example` documents `DB_URL`, `DB_USERNAME` and `DB_PASSWORD`; there are no committed passwords. Spring does not automatically source `.env` files, so export settings in the application environment. Compose can also read a private `.env` file; backend `.env*` files are ignored except `.env.example`. Keep usernames/passwords separate from the JDBC URL and do not include credentials in URL query parameters. Missing settings or an unavailable database fail startup rather than falling back to another database. Check variable presence, Docker readiness, host/port, and credentials; never paste secrets into diagnostic logs.

HikariCP uses a maximum of 5 connections, minimum idle 1, a 5-second connection/startup timeout and 2-second validation timeout. Hibernate uses UTC instants and `ddl-auto: validate`; it cannot create/update schemas. Open Session in View and SQL/bind-value logging are disabled. Flyway validates migration checksums, applies migrations before JPA starts, and has `clean` disabled.

### Schema and relationships

`src/main/resources/db/migration/V1__create_core_schema.sql` is the sole initial migration. Do not edit an already-applied migration; add new versioned migrations for future changes.

```text
User ── 1:1 ── Profile
  ├──── 1:N ── Note
  └──── 1:N ── Checklist ── 1:N ── ChecklistItem
```

All IDs are UUIDs and timestamps are PostgreSQL `TIMESTAMPTZ` / Java `Instant`. Email is normalized lowercase and has a unique constraint. Profiles have a unique user foreign key. Item positions are nonnegative and unique within each checklist. Owner/update indexes support note and checklist lookup; the item-position index supports ordered retrieval.

`new User(email, displayName)` creates its profile in the same persistence operation. The database guarantees at most one profile per user; raw administrative SQL must preserve the application invariant of creating both together. Cascade **PERSIST/MERGE** is limited to user→profile and checklist→items. There is no cascade REMOVE or orphan removal. All foreign keys use `ON DELETE RESTRICT`, so parent deletion cannot silently remove personal data. Explicit deletion/reordering workflows will be designed with future services; reordering must avoid temporarily duplicated positions.

`password_hash` is nullable. There is no plaintext password field, password setter, hashing flow, login, or signup. New users have no password. Authentication will introduce an approved hash format and controlled mutation later. Entities have no generated `toString` that could print private note/password data and are not exposed through controllers. Database conflict responses are sanitized; SQL/bind/error logging is disabled to avoid accidental row-content disclosure.

### Repositories

`UserRepository`, `ProfileRepository`, `NoteRepository`, `ChecklistRepository`, and `ChecklistItemRepository` extend Spring Data JPA. Notes/checklists support ID-and-owner lookups and stable owner-scoped lists; checklist items support checklist-and-owner lookups ordered by position. These queries prepare for ownership enforcement, but **are not authorization**. Future services must use owner-scoped queries and must never expose raw entities through REST endpoints.

### Frontend compatibility

Frontend `body` maps to Note `content`; checklist row `text` maps to item `content`, `done` to `completed`, and row-array order to integer `position`. The backend persists profile `displayName` (80 chars), `bio` (160 chars), `avatarReference`, `avatarColor` and `avatarEmoji`. Pins are stored as booleans on notes/checklists. Backend UUIDs and UTC timestamps will require explicit mapping from legacy browser string IDs/epoch timestamps. No browser data is migrated or uploaded in this milestone.

Bubbles/grouping, photo attachments, Appearance preferences and collection-scoped pin limits remain frontend-only until their backend data models are separately agreed. `avatarReference` is a resource reference, not an upload/storage API. This milestone does not silently reinterpret existing browser data or modify frontend files.

### PostgreSQL tests

```sh
# Docker running; no DB_* credentials required for disposable Testcontainers database.
mvn clean verify
```

Tests use Testcontainers 2.x with PostgreSQL 17 (`postgres:17-alpine`). They run Flyway migrations and real Hibernate validation, exercise every entity/repository and prove owner isolation, uniqueness, foreign keys, ordered items, timestamp updates and protected parent deletion. Existing health/CORS/validation HTTP tests now use the same real PostgreSQL foundation. Tests do not skip when Docker is missing and do not use H2.

If Docker is unavailable, provision a **dedicated disposable PostgreSQL database**, then export `BUBBLE_TEST_DB_URL`, `BUBBLE_TEST_DB_USERNAME` and `BUBBLE_TEST_DB_PASSWORD` before `mvn clean verify`. The test helper accepts only PostgreSQL URLs. Never point tests at personal/production data: tests apply migrations and insert test records. Testcontainers automatically stops/removes its disposable database; the explicitly supplied external database remains the developer's responsibility.

Java/JUnit/Maven requirements from Milestone 01 remain unchanged. No service/controller APIs, security flows, deployment or cloud infrastructure were added.
