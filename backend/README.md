# Bubble backend — Milestones 01–04

Java 21 and Spring Boot 4.1.1, with Spring MVC, Jakarta Bean Validation, Maven, JUnit **5** and Mockito. Milestone 02 adds PostgreSQL, Flyway and JPA repositories. Milestone 03 adds session authentication. Milestone 04 adds notes/checklists APIs. There is no frontend connection or deployment. Actuator is intentionally omitted: the small public health endpoint is sufficient and no internal management endpoints are exposed.

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

Before any future production use, explicitly activate `prod` and set exact approved origins. CORS permits GET, POST, PATCH, DELETE and PUT for `/api/v1/**`, with Accept/Content-Type/X-CSRF-TOKEN headers and credentials for exact approved origins. Spring handles OPTIONS preflights. No wildcard production origins are allowed. CORS is a browser policy, **not authentication**; clients such as curl can call the public health endpoint.

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

Services, repositories and security packages implement persistence and authentication. The committed frontend tree is retained untouched as the shared starting snapshot. All backend changes are confined to `backend/` on the `backend` branch; do not merge into `frontend` automatically.

## Planned milestones

1. This foundation: application setup, health, validation and errors, CORS, tests.
2. Completed: PostgreSQL, Flyway schema migration and Spring Data JPA.
3. Completed: Spring Security and session-based registration/login/logout. Milestone 04 adds authenticated notes/lists APIs.
4. Frontend integration, ownership/privacy rules and a separately agreed synchronization model.

No JWTs or cloud services are introduced. Rate limiting, production TLS/deployment hardening and asynchronous uploads remain future work.


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

`password_hash` remains nullable for legacy Milestone 02 records. Milestone 03 registration sets a controlled BCrypt hash; legacy users without hashes cannot log in. No plaintext password field exists. Entities have no generated `toString` that could print private note/password data and are not exposed through controllers. Database conflict responses are sanitized; SQL/bind/error logging is disabled to avoid accidental row-content disclosure.

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

Java/JUnit/Maven requirements from Milestone 01 remain unchanged. Milestone 02 introduced no service/controller APIs. Milestone 03 authentication is described below; no deployment or cloud infrastructure has been added.

## Milestone 03 — Authentication

### Browser/session design

Accounts are optional for the separate offline frontend; this milestone does not connect or modify it. Authentication uses Spring Security's DAO provider and server-managed sessions, with BCrypt cost 12. Registration atomically creates User/Profile and relies on the database unique constraint to handle duplicate races. Email is trimmed and lowercased. Passwords require at least 12 Unicode characters and at most 72 UTF-8 bytes; passwords are never trimmed. Names must be nonblank and at most 80 characters.

Production is designed for a **same-site HTTPS browser deployment**, ideally one origin with `/api` reverse-proxied to this backend. The `BUBBLE_SESSION` cookie is HttpOnly, SameSite=Lax, path `/`, Secure by default, with a 30-minute idle timeout. Only `local` and `test` disable Secure for HTTP development. Activate `prod` explicitly before deployment. Sessions are held in server memory: server restarts log users out, and multiple instances need a separately designed shared session solution.

Development allows the configured localhost:8081 origins to make credentialed requests to localhost:8080. Use the same hostname on both sides (do not mix localhost and 127.0.0.1). Cross-origin browser requests need `credentials: "include"`. CORS origins are exact and restricted; this is **not a cross-site deployment design**. A future cross-site frontend needs an explicit review of cookie and CSRF policy; do not simply change SameSite or disable CSRF.

### Endpoints and request flow

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/auth/csrf` | Public `{headerName, token}` and session cookie |
| POST | `/api/v1/auth/register` | 201 safe account DTO; does not automatically log in |
| POST | `/api/v1/auth/login` | 200 safe account DTO and authenticated session |
| POST | `/api/v1/auth/logout` | 204, invalidates session and clears cookie |
| GET | `/api/v1/users/me` | Authenticated account `{id,email,displayName,createdAt}` |

GET `/api/v1/health` remains public. All other routes require authentication. Form login, HTTP Basic and request caching are disabled. State-changing requests, **including registration and login**, require a valid `X-CSRF-TOKEN` header and the cookie from GET `/auth/csrf`. The JSON token supports Spring's default masked-token handling. Login rotates the session ID and CSRF token; fetch a fresh CSRF token after login and logout. GET logout never logs out.

Local manual test (with a private cookie jar):

```sh
umask 077
curl -c cookies.txt http://localhost:8080/api/v1/auth/csrf
# Copy the returned token into CSRF_TOKEN without logging it.
# Prepare a private registration.json with email, password, displayName.
curl -b cookies.txt -c cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" --data-binary @registration.json \
  http://localhost:8080/api/v1/auth/register
# Prepare a private login.json with email and password; use the same CSRF flow.
curl -b cookies.txt -c cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" --data-binary @login.json \
  http://localhost:8080/api/v1/auth/login
curl -b cookies.txt http://localhost:8080/api/v1/users/me
curl -b cookies.txt -c cookies.txt http://localhost:8080/api/v1/auth/csrf
# Replace CSRF_TOKEN with this fresh token before logout.
curl -b cookies.txt -c cookies.txt -X POST -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  http://localhost:8080/api/v1/auth/logout
# Remove private request files and cookie jar when finished; never commit them.
```

Validation returns 400, duplicate registration returns sanitized 409, invalid credentials and unauthenticated access return 401, and invalid CSRF/forbidden access returns 403. Credential failures use the same generic message. Responses never serialize entities or password hashes. DTO string representations redact credentials; authenticated principals erase their password hash after authentication. Client-provided user IDs do not select `/users/me` identity.

### Verification and limitations

Run `mvn clean verify` with Docker running. Real HTTP tests exercise the actual security chain and PostgreSQL: normalized registration, hash matching, atomic User/Profile creation, duplicate races, invalid input, successful/failed login, legacy users, session fixation protection, CSRF and token rotation, protected identity, logout/cookie clearing, replay rejection, and cookie/cache attributes. Existing database and HTTP checks remain enabled. No separate Java linter is configured.

No schema migration is needed: V1 already contains `password_hash`; its applied checksum is unchanged. Existing records and frontend files are preserved. Legacy users with null hashes need a future explicitly authorized password setup flow; no default credentials are assigned.

Before public deployment, add and review abuse/rate limiting, account/email verification, password recovery/change, MFA policy, TLS/proxy trust configuration, least-privilege DB roles and operational session management. Duplicate registration's 409 reveals that an address is registered; login remains generic. No password reset emails, third-party login, cloud services or frontend login screens are implemented.

### Changed files

- `pom.xml`: Spring Security starter.
- `src/main/java/com/bubble/config/{SecurityConfig,WebConfig}.java`: authentication, CSRF, cookies/context and credentialed CORS.
- `src/main/java/com/bubble/controller/{AuthController,UserController}.java`: auth and current-user endpoints.
- `src/main/java/com/bubble/dto/{RegisterRequest,LoginRequest,AccountResponse}.java`: validated input and safe output.
- `src/main/java/com/bubble/security/{AccountPrincipal,AccountDetailsService}.java`: erased-credential principal and user lookup.
- `src/main/java/com/bubble/service/AccountService.java`: transactional account creation/read.
- `src/main/java/com/bubble/entity/User.java`: controlled encoded-password initialization.
- `src/main/java/com/bubble/exception/ApiExceptionHandler.java`: sanitized authentication failures.
- `src/main/resources/application{,-local}.yml`, `src/test/resources/application-test.yml`: session cookie configuration.
- `src/test/java/com/bubble/{AuthTestClient,AuthenticationIntegrationTest,BackendIntegrationTest}.java`: actual HTTP security coverage and retained regression checks.
- `README.md`: configuration, usage and limitations.

## Milestone 04 — Notes and checklists REST APIs

All routes below require the Milestone 03 session cookie. Every POST/PATCH/PUT/DELETE also requires the current `X-CSRF-TOKEN` header. Identity always comes from the verified security principal. Owner IDs are never accepted in request bodies. Missing and other users' resources both return the same 404. Unknown JSON properties, explicit null patch values and empty patches return 400.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/notes` | Paginated notes, optional search/pin filtering |
| POST | `/api/v1/notes` | Create note; 201 |
| GET | `/api/v1/notes/{id}` | Read owned note |
| PATCH | `/api/v1/notes/{id}` | Edit supplied title/content/pinned fields |
| DELETE | `/api/v1/notes/{id}` | Delete owned note; 204 |
| GET | `/api/v1/checklists` | Paginated checklist summaries, optional search/pin filtering |
| POST | `/api/v1/checklists` | Create checklist; 201 |
| GET | `/api/v1/checklists/{id}` | Read checklist including items in saved order |
| PATCH | `/api/v1/checklists/{id}` | Edit supplied title/pinned fields |
| DELETE | `/api/v1/checklists/{id}` | Explicitly delete its items and checklist transactionally; 204 |
| POST | `/api/v1/checklists/{id}/items` | Append item; 201 |
| PATCH | `/api/v1/checklists/{id}/items/{itemId}` | Edit content/completed fields |
| DELETE | `/api/v1/checklists/{id}/items/{itemId}` | Delete item, compact positions; 204 |
| PUT | `/api/v1/checklists/{id}/items/order` | Replace item order transactionally |

### Request/response examples

Example bodies use fictional content. Authenticate and obtain a fresh CSRF token as described above; reuse the private cookie jar. Create a note:

```sh
curl -b cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  --data '{"title":"Ideas","content":"Try lavender paper","pinned":false}' \
  http://localhost:8080/api/v1/notes
```

A 201 response contains:

```json
{"id":"11111111-1111-4111-8111-111111111111","title":"Ideas","content":"Try lavender paper","pinned":false,"createdAt":"2026-01-01T10:00:00Z","updatedAt":"2026-01-01T10:00:00Z"}
```

PATCH note: `{"content":"Revised ideas","pinned":true}`. Create checklist: `{"title":"Shopping","pinned":false}`. Add item: `{"content":"Tea"}`. PATCH item: `{"completed":true}` or `{"content":"Herbal tea","completed":false}`. Item responses contain `id`, `content`, `completed`, zero-based `position`, `createdAt` and `updatedAt`. Checklist detail responses contain `id`, `title`, `pinned`, timestamps and `items`. The collection returns summaries without `items`, avoiding loading all children for every row.

Reorder with PUT `/api/v1/checklists/{id}/items/order`:

```json
{"itemIds":["22222222-2222-4222-8222-222222222222","33333333-3333-4333-8333-333333333333"]}
```

Supply **all current item IDs exactly once**, in the desired order. An empty array is valid only for an empty checklist. Missing, duplicate, foreign or unknown IDs return 400 and leave positions unchanged. Item position is server-managed; use the reorder endpoint instead of a `position` property. Appends start incomplete. The API caps each checklist at 1,000 items; existing data is never truncated. Deleting an item compacts remaining positions to `0..n-1`.

### Pagination, filtering and search

Both GET collections accept:

| Parameter | Default | Accepted values |
| --- | --- | --- |
| `page` | `0` | Zero-based, 0–1,000,000 |
| `size` | `20` | 1–100 |
| `sort` | `updatedAt` | `createdAt` or `updatedAt` |
| `direction` | `desc` | `asc` or `desc` |
| `pinned` | omitted | `true` / `false`; omission includes both |
| `q` | omitted | Search text, at most 200 characters; blank means no filter |

Example: `/api/v1/notes?q=lavender&pinned=true&page=0&size=10&sort=updatedAt&direction=desc`. URL-encode query text. Responses have `{content:[...],page:0,size:10,totalElements:1,totalPages:1}`. Empty results have an empty `content` array. UUID ascending breaks timestamp ties in either direction. Pinned filtering does not change the selected chronological order.

Search is a case-insensitive substring match across note title/content, or checklist title/any item content. It is always owner-scoped, parameterized, and escaped so `%`, `_` and backslash are literal characters, not search wildcards. An EXISTS subquery avoids duplicate checklist results when several items match. Search does not require additional infrastructure.

### Validation, transactions and errors

Titles are required, nonblank and at most 100 characters; titles are trimmed. Note content is required on creation, may be empty, and is at most 100,000 characters. Item content is nonblank and at most 10,000 characters. PATCH omits unchanged fields; explicit nulls, unsupported fields and empty patches are rejected. IDs must be UUIDs. Creation defaults `pinned` to false. Existing byte-level request limits also apply, including escaped JSON overhead.

Errors retain `{status,message}`: 400 invalid input/query/order, 401 missing session, 403 invalid CSRF, 404 unavailable resource, 409 database conflict or retryable concurrent locking failure, 413 oversized request, 500 unexpected failure. No database internals or private resource existence is disclosed.

Mutations use transactions and owner-scoped pessimistic row locks. Every checklist/item mutation locks its parent before reading positions or modifying children; concurrent appends/reorders/deletions therefore serialize. Reordering first moves positions above the occupied range, flushes, then assigns contiguous positions and flushes again. Both phases commit or roll back together under the existing immediate uniqueness constraint. Child modifications touch the parent timestamp. Notes also lock before partial updates, preventing concurrent updates of different fields from overwriting one another. Same-field edits use the last applied value; there is no client revision/ETag protocol yet.

There are no new dependencies or migrations. The existing V1 checksum, foreign keys and cascade policies are preserved. API checklist deletion explicitly removes only that owned checklist's children. No frontend files, browser data or other users' content are migrated or changed.

### Tests and modified files

Run `mvn clean verify` with Docker for real PostgreSQL integration tests. The new `ContentIntegrationTest` covers CRUD, persistence, timestamps, ordered items, complete/incomplete toggles, reorder rollback, ownership across every mutation, same-owner wrong-parent items, anonymous access, CSRF, invalid DTOs/query/UUIDs, pagination/pins, stable timestamp ties, literal/case-insensitive search, duplicate-free search and concurrent appends/reorders. Existing authentication and database tests remain enabled.

Milestone 04 changes only:

- `src/main/java/com/bubble/controller/ContentController.java`
- `src/main/java/com/bubble/dto/ContentDtos.java`
- `src/main/java/com/bubble/service/{ContentService,ContentQueries}.java`
- `src/main/java/com/bubble/exception/{ResourceNotFoundException,ApiExceptionHandler}.java`
- `src/main/java/com/bubble/repository/{NoteRepository,ChecklistRepository}.java`
- `src/main/java/com/bubble/entity/Checklist.java`
- `src/main/java/com/bubble/config/WebConfig.java`
- `src/main/resources/application.yml`
- `src/test/java/com/bubble/{ContentIntegrationTest,BackendIntegrationTest}.java`
- `README.md`

Limitations: search uses PostgreSQL substring scans rather than ranked/full-text indexes; deep offset pagination can be expensive. Concurrent edits can shift page membership between requests. The 1,000-item API limit and bounded request sizes deliberately constrain operations; larger collections need a separately designed batch workflow. No frontend connection, cloud service, deployment, restore/soft-delete or offline synchronization is included.

Milestone 04 verification: `mvn clean verify` passed all **34 tests**, with no failures, errors or skipped tests, against disposable PostgreSQL. Compilation and executable-jar packaging succeeded. No standalone Java linter is configured.
