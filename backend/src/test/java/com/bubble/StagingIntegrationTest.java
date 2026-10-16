package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class StagingIntegrationTest {
    @Test void stagingKeepsSecureCookiesCsrfRestrictedCorsAndMinimalHealth() throws Exception {
        try (var context=PostgresTestDatabase.startWithOverrides(Map.of("server.port",0,
                "bubble.cors.allowed-origins","https://localhost:8443"),"staging",BubbleApplication.class)) {
            var base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();
            var http=HttpClient.newHttpClient();
            var health=http.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/health")).GET().build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(200,health.statusCode());
            assertEquals(2,AuthTestClient.JSON.readTree(health.body()).size());
            assertEquals("UP",AuthTestClient.JSON.readTree(health.body()).get("status").asString());
            var csrf=http.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
            var cookie=csrf.headers().firstValue("set-cookie").orElseThrow();
            assertTrue(cookie.contains("Secure"));assertTrue(cookie.contains("HttpOnly"));assertTrue(cookie.contains("SameSite=Lax"));
            assertTrue(csrf.headers().firstValue("cache-control").orElseThrow().contains("no-store"));
            var denied=http.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/auth/register"))
                    .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(403,denied.statusCode());
            var preflight=http.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/notes"))
                    .header("Origin","https://localhost:8443").header("Access-Control-Request-Method","GET")
                    .method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(200,preflight.statusCode());assertEquals("https://localhost:8443",preflight.headers().firstValue("access-control-allow-origin").orElseThrow());
            var bad=http.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/health")).header("Origin","https://untrusted.example").GET().build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(403,bad.statusCode());assertTrue(bad.headers().firstValue("access-control-allow-origin").isEmpty());
            assertFalse(denied.body().contains("Exception"));
        }
    }
}
