package com.bubble;

import com.bubble.entity.User;
import com.bubble.repository.UserRepository;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

class AuthenticationIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    @BeforeAll static void start() {
        context = PostgresTestDatabase.start(BubbleApplication.class);
        base = "http://localhost:" + ((WebServerApplicationContext) context).getWebServer().getPort();
    }
    @AfterAll static void stop() { if (context != null) context.close(); }
    String email() { return UUID.randomUUID() + "@example.test"; }
    AuthTestClient client() { return new AuthTestClient(base); }

    @Test void registrationNormalizesPersistsAndHashes() throws Exception {
        var client = client();
        String email = email();
        var response = client.register("  " + email.toUpperCase(Locale.ROOT) + "  ");
        assertEquals(201, response.statusCode());
        var json = AuthTestClient.JSON.readTree(response.body());
        assertEquals(email, json.get("email").asString());
        assertEquals(4, json.size());
        assertNotNull(json.get("id"));
        assertNotNull(json.get("createdAt"));
        assertFalse(response.body().contains("password"));
        var user = context.getBean(UserRepository.class).findByEmailIgnoreCase(email).orElseThrow();
        assertTrue(user.getPasswordHash().startsWith("{bcrypt}$2a$12$"));
        assertTrue(context.getBean(PasswordEncoder.class).matches(AuthTestClient.PASSWORD, user.getPasswordHash()));
        assertNotEquals(AuthTestClient.PASSWORD, user.getPasswordHash());
        var authentication = context.getBean(org.springframework.security.authentication.AuthenticationManager.class)
                .authenticate(org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .unauthenticated(email, AuthTestClient.PASSWORD));
        assertNull(authentication.getCredentials());
        assertNull(((com.bubble.security.AccountPrincipal) authentication.getPrincipal()).getPassword());
        assertEquals(200, client.login(email).statusCode());
        assertEquals("Bubble Tester", AuthTestClient.JSON.readTree(client.get("/api/v1/users/me").body()).get("displayName").asString());
    }

    @Test void invalidRegistrationAndDuplicatesAreSanitized() throws Exception {
        var client = client();
        for (var input : List.of(
                Map.of("email", "invalid", "password", AuthTestClient.PASSWORD, "displayName", "Name"),
                Map.of("email", email(), "password", "short", "displayName", "Name"),
                Map.of("email", email(), "password", AuthTestClient.PASSWORD, "displayName", " "),
                Map.of("email", email(), "password", "😀".repeat(20), "displayName", "Name"))) {
            var response = client.post("/api/v1/auth/register", input);
            assertEquals(400, response.statusCode());
            assertFalse(response.body().contains(AuthTestClient.PASSWORD));
        }
        String email = email();
        assertEquals(201, client.register(email).statusCode());
        var duplicate = client.register(email.toUpperCase(Locale.ROOT));
        assertEquals(409, duplicate.statusCode());
        assertFalse(duplicate.body().contains(email));
        assertFalse(duplicate.body().contains("constraint"));
    }

    @Test void concurrentDuplicateRegistrationHasOneWinner() throws Exception {
        String email = email();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> client().register(email).statusCode());
            var second = executor.submit(() -> client().register(email).statusCode());
            var statuses = new ArrayList<>(List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(201, 409), statuses);
        }
        assertEquals(1, context.getBean(UserRepository.class).findAll().stream().filter(u -> u.getEmail().equals(email)).count());
    }

    @Test void failedLoginsAreGenericAndLegacyUsersCannotLogin() throws Exception {
        var client = client();
        String email = email();
        client.register(email);
        var wrong = client.post("/api/v1/auth/login", Map.of("email", email, "password", "wrong-password"));
        var unknown = client.login(email());
        assertEquals(401, wrong.statusCode());
        assertEquals(wrong.body(), unknown.body());
        String legacy = email();
        context.getBean(UserRepository.class).saveAndFlush(new User(legacy, "Legacy"));
        assertEquals(401, client.login(legacy).statusCode());
        assertEquals(401, client.get("/api/v1/users/me").statusCode());
    }

    @Test void identityComesFromSessionAndSessionIdRotates() throws Exception {
        var client = client();
        String email = email();
        client.register(email);
        String before = client.session();
        var login = client.login(email);
        assertEquals(200, login.statusCode());
        assertNotEquals(before, client.session());
        var me = client.get("/api/v1/users/me?userId=" + UUID.randomUUID());
        assertEquals(200, me.statusCode());
        assertEquals(email, AuthTestClient.JSON.readTree(me.body()).get("email").asString());
        assertEquals(4, AuthTestClient.JSON.readTree(me.body()).size());
        assertEquals(401, replay(before).statusCode());
        assertEquals(401, client().get("/api/v1/users/me").statusCode());
    }

    @Test void csrfIsRequiredAndLogoutInvalidatesSession() throws Exception {
        var client = client();
        var payload = Map.of("email", email(), "password", AuthTestClient.PASSWORD, "displayName", "Name");
        assertEquals(403, client.rawPost("/api/v1/auth/register", payload, null).statusCode());
        assertEquals(403, client.rawPost("/api/v1/auth/login", payload, "invalid").statusCode());
        String email = email();
        client.register(email);
        String oldToken = client.csrf();
        client.login(email);
        String session = client.session();
        assertEquals(403, client.rawPost("/api/v1/auth/logout", Map.of(), null).statusCode());
        assertEquals(403, client.rawPost("/api/v1/auth/logout", Map.of(), oldToken).statusCode());
        client.get("/api/v1/auth/logout");
        assertEquals(200, client.get("/api/v1/users/me").statusCode());
        var logout = client.post("/api/v1/auth/logout", Map.of());
        assertEquals(204, logout.statusCode());
        assertTrue(logout.headers().allValues("set-cookie").stream().anyMatch(s -> s.startsWith("BUBBLE_SESSION=;")
                        && (s.toLowerCase(Locale.ROOT).contains("max-age=0") || s.contains("Expires=Thu, 01 Jan 1970"))),
                () -> logout.headers().allValues("set-cookie").toString());
        assertEquals(401, client.get("/api/v1/users/me").statusCode());
        assertEquals(401, replay(session).statusCode());
    }

    @Test void csrfCookieHasLocalSecurityAttributesAndResponsesAreNotCached() throws Exception {
        var response = client().get("/api/v1/auth/csrf");
        String cookie = response.headers().firstValue("set-cookie").orElseThrow();
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("SameSite=Lax"));
        assertTrue(response.headers().firstValue("cache-control").orElseThrow().contains("no-store"));
    }

    @Test void restoredNativeStyleCookieUsesServerProfileOwnerAndStopsAfterLogout() throws Exception {
        var first = client(); var second = client();
        String firstEmail = email(); String secondEmail = email();
        assertEquals(201, first.register(firstEmail).statusCode());
        assertEquals(201, second.register(secondEmail).statusCode());
        assertEquals(200, first.login(firstEmail).statusCode());
        assertEquals(200, second.login(secondEmail).statusCode());
        var change = first.send(HttpRequest.newBuilder(URI.create(base + "/api/v1/profile"))
                .header("Content-Type", "application/json").header("X-CSRF-TOKEN", first.csrf())
                .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"displayName\":\"Synthetic First Owner\"}")));
        assertEquals(200, change.statusCode());
        String secondId = AuthTestClient.JSON.readTree(second.get("/api/v1/users/me").body()).get("id").asString();
        String session = first.session();
        var restored = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder(URI.create(base + "/api/v1/profile?userId=" + secondId))
                .header("Cookie", "BUBBLE_SESSION=" + session).GET().build();
        var profile = restored.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, profile.statusCode());
        assertEquals("Synthetic First Owner", AuthTestClient.JSON.readTree(profile.body()).get("displayName").asString());
        assertEquals("Bubble Tester", AuthTestClient.JSON.readTree(second.get("/api/v1/profile").body()).get("displayName").asString());
        assertEquals(204, first.post("/api/v1/auth/logout", Map.of()).statusCode());
        assertEquals(401, restored.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
        assertEquals(200, second.get("/api/v1/profile").statusCode());
    }

    HttpResponse<String> replay(String session) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(base + "/api/v1/users/me"))
                .header("Cookie", "BUBBLE_SESSION=" + session).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
}
