package com.bubble;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

final class AuthTestClient {
    static final JsonMapper JSON = JsonMapper.builder().build();
    static final String PASSWORD = "test-only-long-passphrase";
    final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
    final String base;
    AuthTestClient(String base) { this.base = base; }
    HttpResponse<String> get(String path) throws Exception {
        return send(HttpRequest.newBuilder(URI.create(base + path)).GET());
    }
    String csrf() throws Exception {
        var response = get("/api/v1/auth/csrf");
        if (response.statusCode() != 200) throw new AssertionError("CSRF request failed");
        return JSON.readTree(response.body()).get("token").asString();
    }
    HttpResponse<String> post(String path, Map<String, String> input) throws Exception {
        return rawPost(path, input, csrf());
    }
    HttpResponse<String> rawPost(String path, Map<String, String> input, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(base + path)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(input)));
        if (token != null) request.header("X-CSRF-TOKEN", token);
        return send(request);
    }
    HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
    HttpResponse<String> register(String email) throws Exception {
        return post("/api/v1/auth/register", Map.of("email", email, "password", PASSWORD, "displayName", "Bubble Tester"));
    }
    HttpResponse<String> login(String email) throws Exception {
        return post("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD));
    }
    String session() {
        return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("BUBBLE_SESSION"))
                .findFirst().orElseThrow().getValue();
    }
}
