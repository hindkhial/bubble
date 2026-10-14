package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class HardeningIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    AuthTestClient client;
    @BeforeAll static void start() {
        context=PostgresTestDatabase.startWithOverrides(Map.of("bubble.http.max-request-bytes",1048576),"test",BubbleApplication.class);
        base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();
    }
    @AfterAll static void stop(){if(context!=null)context.close();}
    @BeforeEach void account() throws Exception {
        client=new AuthTestClient(base);String email=UUID.randomUUID()+"@example.test";
        assertEquals(201,client.register(email).statusCode());assertEquals(200,client.login(email).statusCode());
    }
    HttpResponse<String> send(String method,String path,String json) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create(base+path)).header("Content-Type","application/json")
                .header("X-CSRF-TOKEN",client.csrf()).method(method,HttpRequest.BodyPublishers.ofString(json)));
    }
    @Test void duplicateFieldsWrongTypesAndNumericEnumsAreRejected() throws Exception {
        for(String json:List.of("{\"themeMode\":0}","{\"themeMode\":\"DARK\",\"themeMode\":\"LIGHT\"}","{\"accentColor\":true}"))
            assertEquals(400,send("PATCH","/api/v1/preferences",json).statusCode());
        assertEquals(400,send("POST","/api/v1/notes","{\"title\":123,\"content\":\"body\"}").statusCode());
        assertEquals(400,send("POST","/api/v1/notes","{\"title\":\"Title\",\"content\":\"body\",\"pinned\":\"true\"}").statusCode());
        assertEquals(400,send("POST","/api/v1/notes","{").statusCode());
    }
    @Test void databaseTextRejectsNulAndBrokenUnicodeBeforeSql() throws Exception {
        for(String content:List.of("secret\u0000text",new String(new char[]{(char)0xd800}))) {
            var json=content.charAt(0)==(char)0xd800
                    ? "{\"title\":\"Title\",\"content\":\"" + (char)92 + "ud800\"}"
                    : AuthTestClient.JSON.writeValueAsString(Map.of("title","Title","content",content));
            var response=send("POST","/api/v1/notes",json);assertEquals(400,response.statusCode());
            assertFalse(response.body().contains("secret"));assertFalse(response.body().contains("SQL"));
        }
        assertEquals(0,AuthTestClient.JSON.readTree(client.get("/api/v1/notes").body()).get("totalElements").asInt());
    }
    @Test void exactContentBoundariesAndAtomicInvalidUpdates() throws Exception {
        var created=send("POST","/api/v1/notes",AuthTestClient.JSON.writeValueAsString(Map.of("title","x".repeat(100),"content","x".repeat(100000))));
        assertEquals(201,created.statusCode());String id=AuthTestClient.JSON.readTree(created.body()).get("id").asString();
        assertEquals(400,send("PATCH","/api/v1/notes/"+id,AuthTestClient.JSON.writeValueAsString(Map.of("title","Changed","content","x".repeat(100001)))).statusCode());
        assertEquals("x".repeat(100),AuthTestClient.JSON.readTree(client.get("/api/v1/notes/"+id).body()).get("title").asString());
        var list=send("POST","/api/v1/checklists","{\"title\":\"List\"}");String listId=AuthTestClient.JSON.readTree(list.body()).get("id").asString();
        String path="/api/v1/checklists/"+listId+"/items";
        assertEquals(201,send("POST",path,AuthTestClient.JSON.writeValueAsString(Map.of("content","x".repeat(10000)))).statusCode());
        assertEquals(400,send("POST",path,AuthTestClient.JSON.writeValueAsString(Map.of("content","x".repeat(10001)))).statusCode());
        assertEquals(400,send("POST",path,"{\"content\":\"item\",\"position\":-1}").statusCode());
    }
    @Test void everyPrivateRouteRejectsAnonymousRequestsAndClientIds() throws Exception {
        var anonymous=new AuthTestClient(base);String id=UUID.randomUUID().toString();
        for(String path:List.of("/api/v1/users/me","/api/v1/profile","/api/v1/preferences","/api/v1/notes","/api/v1/notes/"+id,
                "/api/v1/checklists","/api/v1/checklists/"+id))assertEquals(401,anonymous.get(path).statusCode());
        for(String spec:List.of("POST /api/v1/notes","PATCH /api/v1/notes/"+id,"DELETE /api/v1/notes/"+id,
                "POST /api/v1/checklists","PATCH /api/v1/checklists/"+id,"DELETE /api/v1/checklists/"+id,
                "POST /api/v1/checklists/"+id+"/items","PATCH /api/v1/checklists/"+id+"/items/"+id,
                "DELETE /api/v1/checklists/"+id+"/items/"+id,"PUT /api/v1/checklists/"+id+"/items/order",
                "PATCH /api/v1/profile","PATCH /api/v1/preferences")) {
            String[] parts=spec.split(" ");
            var response=anonymous.send(HttpRequest.newBuilder(URI.create(base+parts[1])).header("X-CSRF-TOKEN",anonymous.csrf())
                    .header("Content-Type","application/json").method(parts[0],HttpRequest.BodyPublishers.ofString("{}")));
            assertEquals(401,response.statusCode(),spec);
        }
    }
    @Test void securityHeadersCorsAndOversizedAnonymousAuthRequests() throws Exception {
        var health=new AuthTestClient(base).get("/api/v1/health");
        assertEquals("nosniff",health.headers().firstValue("x-content-type-options").orElseThrow());
        assertEquals("DENY",health.headers().firstValue("x-frame-options").orElseThrow());
        assertTrue(health.headers().firstValue("content-security-policy").orElseThrow().contains("default-src 'none'"));
        assertTrue(health.headers().firstValue("cache-control").orElseThrow().contains("no-store"));
        for(String method:List.of("GET","POST","PATCH","DELETE","PUT")) {
            var preflight=client.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/notes"))
                    .header("Origin","http://localhost:8081").header("Access-Control-Request-Method",method)
                    .header("Access-Control-Request-Headers","X-CSRF-TOKEN,Content-Type").method("OPTIONS",HttpRequest.BodyPublishers.noBody()));
            assertEquals(200,preflight.statusCode());assertEquals("true",preflight.headers().firstValue("access-control-allow-credentials").orElseThrow());
        }
        var rejected=client.get("/api/v1/notes//invalid");
        assertEquals(400,rejected.statusCode());assertEquals(400,AuthTestClient.JSON.readTree(rejected.body()).get("status").asInt());
        assertEquals(413,send("POST","/api/v1/auth/login","x".repeat(1048577)).statusCode());
    }
}
