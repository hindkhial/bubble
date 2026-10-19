package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class PasswordChangeIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    static final String NEXT = "synthetic-new-passphrase-2026";
    @BeforeAll static void start() {
        context = PostgresTestDatabase.start(BubbleApplication.class);
        base = "http://localhost:" + ((WebServerApplicationContext) context).getWebServer().getPort();
    }
    @AfterAll static void stop() { if (context != null) context.close(); }
    String email() { return UUID.randomUUID() + "@example.test"; }
    AuthTestClient signed(String email) throws Exception {
        var client = new AuthTestClient(base); assertEquals(201, client.register(email).statusCode());
        assertEquals(200, client.login(email).statusCode()); return client;
    }
    HttpResponse<String> change(AuthTestClient client, String current, String next, String token, String suffix) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + "/api/v1/users/me/password" + suffix))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(AuthTestClient.JSON.writeValueAsString(
                        Map.of("currentPassword", current, "newPassword", next))));
        if (token != null) request.header("X-CSRF-TOKEN", token);
        return client.send(request);
    }
    @Test void changeRevokesAllOwnerSessionsPreservesDataAndDoesNotAffectOtherAccounts() throws Exception {
        String email = email(); var first = signed(email); var other = signed(email());
        var second = new AuthTestClient(base); assertEquals(200, second.login(email).statusCode());
        String secondCookie = second.session();
        var note = first.post("/api/v1/notes", Map.of("title", "Synthetic retained note", "content", "Retain this"));
        assertEquals(201, note.statusCode());
        String before = first.get("/api/v1/notes").body();
        String profile = first.get("/api/v1/profile").body();
        String preferences = first.get("/api/v1/preferences").body();
        var response = change(first, AuthTestClient.PASSWORD, NEXT, first.csrf(), "");
        assertEquals(204, response.statusCode()); assertEquals("", response.body());
        assertEquals(401, first.get("/api/v1/users/me").statusCode());
        var rejected = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(base + "/api/v1/users/me"))
                .header("Cookie", "BUBBLE_SESSION=" + secondCookie).header("Origin", "http://localhost:8081")
                .GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(401, rejected.statusCode());
        assertTrue(rejected.headers().firstValue("cache-control").orElseThrow().contains("no-store"));
        assertEquals("nosniff", rejected.headers().firstValue("x-content-type-options").orElseThrow());
        assertEquals("http://localhost:8081", rejected.headers().firstValue("access-control-allow-origin").orElseThrow());
        assertEquals(401, second.get("/api/v1/users/me").statusCode());
        assertEquals(200, other.get("/api/v1/users/me").statusCode());
        assertEquals(401, first.login(email).statusCode());
        assertEquals(200, first.post("/api/v1/auth/login", Map.of("email", email, "password", NEXT)).statusCode());
        assertEquals(before, first.get("/api/v1/notes").body());
        assertEquals(profile, first.get("/api/v1/profile").body());
        assertEquals(preferences, first.get("/api/v1/preferences").body());
    }
    @Test void rejectsIncorrectCurrentWeakAndOversizedPasswordsWithoutLosingSession() throws Exception {
        var client = signed(email());
        for (var values : List.of(List.of("incorrect-password", NEXT), List.of(AuthTestClient.PASSWORD, "short"),
                List.of(AuthTestClient.PASSWORD, "😀".repeat(20)), List.of(AuthTestClient.PASSWORD, AuthTestClient.PASSWORD))) {
            var response = change(client, values.get(0), values.get(1), client.csrf(), "");
            assertEquals(400, response.statusCode());
            assertFalse(response.body().contains(values.get(0))); assertFalse(response.body().contains(values.get(1)));
            assertEquals(200, client.get("/api/v1/users/me").statusCode());
        }
    }
    @Test void requiresAuthenticationAndCsrf() throws Exception {
        var anonymous = new AuthTestClient(base);
        assertEquals(401, change(anonymous, AuthTestClient.PASSWORD, NEXT, anonymous.csrf(), "").statusCode());
        var client = signed(email());
        assertEquals(403, change(client, AuthTestClient.PASSWORD, NEXT, null, "").statusCode());
        assertEquals(403, change(client, AuthTestClient.PASSWORD, NEXT, "invalid", "").statusCode());
    }
    @Test void identityComesFromPrincipalAndRepeatedGuessingIsLimited() throws Exception {
        String ownerEmail = email(); var owner = signed(ownerEmail); String victimEmail = email(); var victim = signed(victimEmail);
        String victimId = AuthTestClient.JSON.readTree(victim.get("/api/v1/users/me").body()).get("id").asString();
        assertEquals(204, change(owner, AuthTestClient.PASSWORD, NEXT, owner.csrf(), "?userId=" + victimId).statusCode());
        assertEquals(200, victim.login(victimEmail).statusCode());
        assertEquals(401, victim.post("/api/v1/auth/login", Map.of("email", victimEmail, "password", NEXT)).statusCode());
        var guessing = signed(email());
        for (int i = 0; i < 5; i++) assertEquals(400, change(guessing, "wrong-password", NEXT, guessing.csrf(), "").statusCode());
        var limited = change(guessing, "wrong-password", NEXT, guessing.csrf(), "");
        assertEquals(429, limited.statusCode()); assertEquals("60", limited.headers().firstValue("Retry-After").orElseThrow());
    }
}
