package com.bubble;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.junit.jupiter.api.Assertions.*;

class BackendIntegrationTest {
    private static ConfigurableApplicationContext context;
    private static String base;
    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    @BeforeAll
    static void start() {
        context = new SpringApplicationBuilder(BubbleApplication.class)
                .profiles("test").run();
        base = "http://localhost:" + ((WebServerApplicationContext) context).getWebServer().getPort();
    }

    @AfterAll
    static void stop() {
        if (context != null) context.close();
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return CLIENT.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void applicationStartsWithoutDatabase() {
        assertTrue(context.isActive());
        assertNotNull(context.getBean(BubbleApplication.class));
    }

    @Test
    void healthReturnsOnlyPublicDetails() throws Exception {
        var response = send(HttpRequest.newBuilder(URI.create(base + "/api/v1/health")).GET());
        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("content-type").orElse("").startsWith("application/json"));
        assertEquals("{\"status\":\"UP\",\"application\":\"Bubble\"}", response.body());
    }

    @Test
    void corsAllowsOnlyConfiguredOriginAndGet() throws Exception {
        var allowed = send(HttpRequest.newBuilder(URI.create(base + "/api/v1/health"))
                .header("Origin", "http://localhost:8081").header("Access-Control-Request-Method", "GET")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()));
        assertEquals(200, allowed.statusCode());
        assertEquals("http://localhost:8081", allowed.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        assertTrue(allowed.headers().firstValue("Access-Control-Allow-Credentials").isEmpty());
        var denied = send(HttpRequest.newBuilder(URI.create(base + "/api/v1/health"))
                .header("Origin", "https://untrusted.example").GET());
        assertEquals(403, denied.statusCode());
        assertTrue(denied.headers().firstValue("Access-Control-Allow-Origin").isEmpty());
        var post = send(HttpRequest.newBuilder(URI.create(base + "/api/v1/health"))
                .header("Origin", "http://localhost:8081").header("Access-Control-Request-Method", "POST")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()));
        assertEquals(403, post.statusCode());
    }

    @Test
    void validationReturnsSanitizedBadRequest() throws Exception {
        var response = send(HttpRequest.newBuilder(URI.create(base + "/_test/validate"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"name\":\"\"}")));
        assertEquals(400, response.statusCode());
        assertFalse(response.body().contains("stackTrace"));
        assertFalse(response.body().contains("NotBlank"));
        var malformed = send(HttpRequest.newBuilder(URI.create(base + "/_test/validate"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{")));
        assertEquals(400, malformed.statusCode());
        assertFalse(malformed.body().contains("Exception"));
    }

    @Test
    void unexpectedErrorsDoNotLeakInternalMessages() throws Exception {
        var response = send(HttpRequest.newBuilder(URI.create(base + "/_test/failure")).GET());
        assertEquals(500, response.statusCode());
        assertEquals("{\"status\":500,\"message\":\"An unexpected error occurred.\"}", response.body());
        assertFalse(response.body().contains("internal-secret"));
    }

    @Test
    void oversizedFixedAndChunkedRequestsAreRejected() throws Exception {
        var bytes = "x".repeat(1025).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        for (var body : java.util.List.of(HttpRequest.BodyPublishers.ofByteArray(bytes),
                HttpRequest.BodyPublishers.ofInputStream(() -> new java.io.ByteArrayInputStream(bytes)))) {
            var response = send(HttpRequest.newBuilder(URI.create(base + "/_test/validate"))
                    .header("Content-Type", "application/json").POST(body));
            assertEquals(413, response.statusCode());
        }
    }

    @Test
    void unknownPathsAndWrongMethodsRemainClientErrors() throws Exception {
        assertEquals(404, send(HttpRequest.newBuilder(URI.create(base + "/missing")).GET()).statusCode());
        assertEquals(405, send(HttpRequest.newBuilder(URI.create(base + "/api/v1/health"))
                .POST(HttpRequest.BodyPublishers.noBody())).statusCode());
    }

    // Test-only controllers are never included in the packaged application.
    @RestController
    static class FixtureController {
        record ValidatedInput(@NotBlank String name) {}
        @PostMapping("/_test/validate") String validate(@Valid @RequestBody ValidatedInput input) { return input.name(); }
        @GetMapping("/_test/failure") String fail() { throw new IllegalStateException("internal-secret"); }
    }
}
