package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class ProductionSecurityIntegrationTest {
    @Test void productionCookiesCorsAndAuthThrottleUseActualSecurityChain() throws Exception {
        try(var context=PostgresTestDatabase.startWithOverrides(Map.of("server.port",0,"bubble.cors.allowed-origins","",
                "bubble.auth-limits.per-address-per-minute",3,"bubble.auth-limits.total-per-minute",4),"prod",BubbleApplication.class)) {
            String base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();
            var client=HttpClient.newHttpClient();
            var csrf=client.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
            String cookie=csrf.headers().firstValue("set-cookie").orElseThrow();
            assertTrue(cookie.contains("Secure"));assertTrue(cookie.contains("HttpOnly"));assertTrue(cookie.contains("SameSite=Lax"));
            String token=AuthTestClient.JSON.readTree(csrf.body()).get("token").asString();
            // Raw HTTP client deliberately supplies the cookie; a browser requires production HTTPS.
            for(int i=0;i<4;i++) {
                var response=client.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/auth/register"))
                        .header("Cookie",cookie.split(";")[0]).header("X-CSRF-TOKEN",token)
                        .header("X-Forwarded-For","192.0.2."+i).header("Content-Type","application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{}")).build(),HttpResponse.BodyHandlers.ofString());
                assertEquals(i<3?400:429,response.statusCode());
                if(i==3){assertEquals("60",response.headers().firstValue("retry-after").orElseThrow());assertTrue(response.body().contains("Too many authentication requests"));}
            }
            var denied=client.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/health")).header("Origin","https://untrusted.example").GET().build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(403,denied.statusCode());assertEquals(403,AuthTestClient.JSON.readTree(denied.body()).get("status").asInt());assertTrue(denied.headers().firstValue("access-control-allow-origin").isEmpty());
            assertEquals(200,new AuthTestClient(base).get("/api/v1/health").statusCode());
        }
    }
}
