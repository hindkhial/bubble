# Bubble backend — Milestone 01

Java 21 and Spring Boot 4.1.1, with Spring MVC, Jakarta Bean Validation, Maven, JUnit **5** and Mockito. There is no database, authentication, notes/list API, frontend connection, or deployment in this milestone. Actuator is intentionally omitted: the small public health endpoint is sufficient and no internal management endpoints are exposed.

## Requirements

- A Java **21 JDK**, with `JAVA_HOME` pointing to the JDK and `java` available on `PATH`.
- Maven **3.6.3+** (verified with 3.9.11).
- Access to Maven Central for the initial dependency download. Tests and startup need no external service or database.

The Maven Enforcer check requires Java 21. Spring Boot's current stable line supports Java 21; see [Spring Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html). JUnit Jupiter is explicitly pinned to 5.14.4 because this milestone requests JUnit 5, rather than Boot 4.1's JUnit 6 default. Integration tests use a real embedded server and JDK HTTP client without requiring a different JUnit version.

## Setup and run

From the repository checkout:

```sh
git switch backend
cd backend
java -version
mvn -version
mvn clean verify
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

Stop the foreground server with Ctrl-C. It does not require the frontend to be running.

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

`verify` includes compilation, Java/Maven version checks, JUnit 5 tests, packaging and Spring Boot executable-jar repackaging. No separate formatter/linter is configured. Tests start the app on an ephemeral port with the `test` profile and validate startup, health JSON, CORS allow/deny behavior, bean validation, malformed JSON, sanitized 500s, 404/405 status preservation, request size limits and configuration validation. Fixture-only endpoints live in test sources and are absent from the production jar. Mockito verifies the validation-exception response in a focused unit test.

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
2. PostgreSQL, schema migrations and Spring Data JPA (after agreeing the data model).
3. Spring Security and account/authentication design, then authenticated notes/lists APIs.
4. Frontend integration, ownership/privacy rules and a separately agreed synchronization model.

No passwords, JWTs, authentication server, database entities or cloud services are implemented here. Runtime hardening, authentication, rate limiting, TLS/deployment and asynchronous upload support remain future work; this milestone is a local foundation, not a production deployment.
