package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;

class SettingsIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    AuthTestClient client;
    String email;
    @BeforeAll static void start() {
        context = PostgresTestDatabase.start(BubbleApplication.class);
        base = "http://localhost:" + ((WebServerApplicationContext)context).getWebServer().getPort();
    }
    @AfterAll static void stop() { if (context != null) context.close(); }
    @BeforeEach void account() throws Exception {
        client = new AuthTestClient(base); email = UUID.randomUUID()+"@example.test";
        assertEquals(201,client.register(email).statusCode()); assertEquals(200,client.login(email).statusCode());
    }
    HttpResponse<String> patch(AuthTestClient who, String path, Object body) throws Exception {
        return who.send(HttpRequest.newBuilder(URI.create(base+path)).header("X-CSRF-TOKEN",who.csrf())
                .header("Content-Type","application/json").method("PATCH",
                        HttpRequest.BodyPublishers.ofString(AuthTestClient.JSON.writeValueAsString(body))));
    }
    JsonNode patch(String path,Object body,int status) throws Exception {
        var response=patch(client,path,body); assertEquals(status,response.statusCode(),response.body());
        return AuthTestClient.JSON.readTree(response.body());
    }
    JsonNode get(String path) throws Exception {
        var response=client.get(path);assertEquals(200,response.statusCode(),response.body());
        return AuthTestClient.JSON.readTree(response.body());
    }
    UUID userId() { return context.getBean(com.bubble.repository.UserRepository.class).findByEmailIgnoreCase(email).orElseThrow().getId(); }

    @Test void profileReadAndPartialUpdatePreserveOtherValues() throws Exception {
        var before=get("/api/v1/profile");assertEquals("Bubble Tester",before.get("displayName").asString());
        assertFalse(before.has("password"));assertFalse(before.has("email"));assertFalse(before.has("user"));
        var after=patch("/api/v1/profile",Map.of("displayName","  New name  "),200);
        assertEquals("New name",after.get("displayName").asString());assertEquals(before.get("createdAt"),after.get("createdAt"));
        assertTrue(java.time.Instant.parse(after.get("updatedAt").asString()).isAfter(java.time.Instant.parse(before.get("updatedAt").asString())));
        assertEquals("New name",get("/api/v1/users/me").get("displayName").asString());
        patch("/api/v1/profile",Map.of("bio","A short bio"),200);
        assertEquals("New name",get("/api/v1/profile").get("displayName").asString());
        assertEquals("A short bio",get("/api/v1/profile").get("bio").asString());
    }
    @Test void bioAndAvatarSupportExplicitNullClearingAndOmission() throws Exception {
        String reference="avatar:"+UUID.randomUUID();
        patch("/api/v1/profile",Map.of("bio","About me","avatarReference",reference),200);
        patch("/api/v1/profile",Map.of("displayName","Edited"),200);
        var unchanged=get("/api/v1/profile");assertEquals("About me",unchanged.get("bio").asString());
        assertEquals(reference,unchanged.get("avatarReference").asString());
        var cleared=patch("/api/v1/profile",Collections.singletonMap("bio",null),200);
        assertTrue(cleared.get("bio").isNull());assertEquals(reference,cleared.get("avatarReference").asString());
        cleared=patch("/api/v1/profile",Collections.singletonMap("avatarReference",null),200);
        assertTrue(cleared.get("avatarReference").isNull());assertEquals("Edited",cleared.get("displayName").asString());
        patch("/api/v1/profile",Map.of("bio",""),200);assertEquals("",get("/api/v1/profile").get("bio").asString());
        var saved=context.getBean(com.bubble.repository.ProfileRepository.class).findByUser_Id(userId()).orElseThrow();
        assertNull(saved.getAvatarReference());assertEquals("",saved.getBio());
    }
    @Test void profileValidationRejectsUnsafeReferencesAndInvalidFields() throws Exception {
        for(Object input:List.of(Map.of(),Map.of("displayName"," "),Map.of("displayName","x".repeat(81)),
                Collections.singletonMap("displayName",null),Map.of("bio","x".repeat(161)),
                Map.of("avatarReference","https://example.test/image.png"),Map.of("avatarReference","file:///tmp/image"),
                Map.of("avatarReference","../image"),Map.of("avatarReference","javascript:alert(1)"),
                Map.of("avatarReference","data:image/png;base64,aaaa"),Map.of("avatarReference","avatar:not-a-uuid"),
                Map.of("userId",UUID.randomUUID(),"bio","attack"),Map.of("avatarReference",""))) {
            var response=patch("/api/v1/profile",input,400);assertEquals(400,response.get("status").asInt());
            assertFalse(response.toString().contains("Exception"));
        }
        assertEquals("Bubble Tester",get("/api/v1/profile").get("displayName").asString());
    }
    @Test void defaultPreferencesArePersistedOnceAndUpdatesPreserveOtherFields() throws Exception {
        var before=get("/api/v1/preferences");assertEquals("LIGHT",before.get("themeMode").asString());
        assertEquals("Lavender",before.get("accentColor").asString());
        var repo=context.getBean(com.bubble.repository.UserPreferencesRepository.class);
        UUID id=repo.findByUser_Id(userId()).orElseThrow().getId();
        get("/api/v1/preferences");assertEquals(id,repo.findByUser_Id(userId()).orElseThrow().getId());
        var after=patch("/api/v1/preferences",Map.of("themeMode","DARK"),200);
        assertEquals("DARK",after.get("themeMode").asString());assertEquals("Lavender",after.get("accentColor").asString());
        assertEquals(before.get("createdAt"),after.get("createdAt"));
        assertTrue(java.time.Instant.parse(after.get("updatedAt").asString()).isAfter(java.time.Instant.parse(before.get("updatedAt").asString())));
        after=patch("/api/v1/preferences",Map.of("accentColor","Denim blue"),200);
        assertEquals("DARK",after.get("themeMode").asString());
        assertEquals("Denim blue",repo.findByUser_Id(userId()).orElseThrow().getAccentColor());
        for(String theme:List.of("LIGHT","DARK","SYSTEM"))patch("/api/v1/preferences",Map.of("themeMode",theme),200);
        for(String color:List.of("Lavender","Rose","Sage","Deep lavender","Sky blue","Dusty pink","Denim blue"))
            patch("/api/v1/preferences",Map.of("accentColor",color),200);
    }
    @Test void invalidPreferencesFailWithoutOverwritingValidValues() throws Exception {
        for(Object input:List.of(Map.of(),Map.of("themeMode","light"),Map.of("themeMode","AUTO"),
                Collections.singletonMap("themeMode",null),Collections.singletonMap("accentColor",null),
                Map.of("accentColor","#ffffff"),Map.of("accentColor","Blue"),Map.of("themeMode","DARK","accentColor","bad"),
                Map.of("userId",UUID.randomUUID(),"themeMode","DARK")))patch("/api/v1/preferences",input,400);
        assertEquals("LIGHT",get("/api/v1/preferences").get("themeMode").asString());
        assertEquals("Lavender",get("/api/v1/preferences").get("accentColor").asString());
    }
    @Test void authenticationCsrfAndUserIsolationAreEnforced() throws Exception {
        var anonymous=new AuthTestClient(base);
        for(String path:List.of("/api/v1/profile","/api/v1/preferences")) {
            assertEquals(401,anonymous.get(path).statusCode());
            assertEquals(401,patch(anonymous,path,path.endsWith("profile")?Map.of("bio","x"):Map.of("themeMode","DARK")).statusCode());
            var response=client.send(HttpRequest.newBuilder(URI.create(base+path)).header("Content-Type","application/json")
                    .method("PATCH",HttpRequest.BodyPublishers.ofString("{}")));
            assertEquals(403,response.statusCode());
        }
        var stranger=new AuthTestClient(base);String other=UUID.randomUUID()+"@example.test";
        stranger.register(other);stranger.login(other);
        patch("/api/v1/profile",Map.of("bio","Private"),200);
        patch("/api/v1/preferences",Map.of("themeMode","DARK"),200);
        assertTrue(AuthTestClient.JSON.readTree(stranger.get("/api/v1/profile?userId="+userId()).body()).get("bio").isNull());
        assertEquals("LIGHT",AuthTestClient.JSON.readTree(stranger.get("/api/v1/preferences?userId="+userId()).body()).get("themeMode").asString());
        assertEquals(400,patch(stranger,"/api/v1/profile",Map.of("userId",userId(),"bio","Attack")).statusCode());
        assertEquals(404,stranger.get("/api/v1/profile/"+userId()).statusCode());
        assertEquals("Private",get("/api/v1/profile").get("bio").asString());
        assertEquals("DARK",get("/api/v1/preferences").get("themeMode").asString());
    }
    @Test void persistenceSurvivesANewSessionAndKeepsAvatarCustomization() throws Exception {
        String reference="avatar:"+UUID.randomUUID();
        var profiles=context.getBean(com.bubble.repository.ProfileRepository.class);
        var saved=profiles.findByUser_Id(userId()).orElseThrow();saved.setAvatarColor("#392D49");saved.setAvatarEmoji("🐱");profiles.saveAndFlush(saved);
        patch("/api/v1/profile",Map.of("bio","Persisted","avatarReference",reference),200);
        patch("/api/v1/preferences",Map.of("themeMode","SYSTEM","accentColor","Sky blue"),200);
        var another=new AuthTestClient(base);assertEquals(200,another.login(email).statusCode());
        assertEquals(reference,AuthTestClient.JSON.readTree(another.get("/api/v1/profile").body()).get("avatarReference").asString());
        assertEquals("SYSTEM",AuthTestClient.JSON.readTree(another.get("/api/v1/preferences").body()).get("themeMode").asString());
        saved=profiles.findByUser_Id(userId()).orElseThrow();assertEquals("#392D49",saved.getAvatarColor());assertEquals("🐱",saved.getAvatarEmoji());
    }
    @Test void concurrentPartialUpdatesDoNotLoseUnrelatedFields() throws Exception {
        var another=new AuthTestClient(base);another.login(email);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->patch(client,"/api/v1/preferences",Map.of("themeMode","DARK")));
            var b=pool.submit(()->patch(another,"/api/v1/preferences",Map.of("accentColor","Rose")));
            assertEquals(200,a.get(30,TimeUnit.SECONDS).statusCode());assertEquals(200,b.get(30,TimeUnit.SECONDS).statusCode());
            var c=pool.submit(()->patch(client,"/api/v1/profile",Map.of("displayName","New name")));
            var d=pool.submit(()->patch(another,"/api/v1/profile",Map.of("bio","New bio")));
            assertEquals(200,c.get(30,TimeUnit.SECONDS).statusCode());assertEquals(200,d.get(30,TimeUnit.SECONDS).statusCode());
        }
        var preferences=get("/api/v1/preferences");assertEquals("DARK",preferences.get("themeMode").asString());assertEquals("Rose",preferences.get("accentColor").asString());
        var profile=get("/api/v1/profile");assertEquals("New name",profile.get("displayName").asString());assertEquals("New bio",profile.get("bio").asString());
    }
    @Test void missingProfileAndPreferencesReturnSanitizedNotFound() throws Exception {
        var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
        jdbc.update("delete from profiles where user_id = ?",userId());
        var response=client.get("/api/v1/profile");assertEquals(404,response.statusCode());assertEquals("Resource not found.",AuthTestClient.JSON.readTree(response.body()).get("message").asString());
        jdbc.update("delete from user_preferences where user_id = ?",userId());
        assertEquals(404,client.get("/api/v1/preferences").statusCode());
    }
}
