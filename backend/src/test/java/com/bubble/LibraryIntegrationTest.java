package com.bubble;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;

class LibraryIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    AuthTestClient client;
    Map<AuthTestClient,String> emails=new HashMap<>();
    @BeforeAll static void start(){context=PostgresTestDatabase.start(BubbleApplication.class);base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();}
    @AfterAll static void stop(){if(context!=null)context.close();}
    AuthTestClient account() throws Exception {var value=new AuthTestClient(base);String email=UUID.randomUUID()+"@example.test";assertEquals(201,value.register(email).statusCode());assertEquals(200,value.login(email).statusCode());emails.put(value,email);return value;}
    @BeforeEach void login() throws Exception {client=account();}
    JsonNode request(AuthTestClient who,String method,String path,Object body,int expected) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create(base+"/api/v1"+path));
        if(!method.equals("GET"))builder.header("X-CSRF-TOKEN",who.csrf());
        builder.header("Content-Type","application/json").method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(AuthTestClient.JSON.writeValueAsString(body)));
        var response=who.send(builder);assertEquals(expected,response.statusCode(),response.body());
        return expected==204?null:AuthTestClient.JSON.readTree(response.body());
    }
    Map<String,Object> entry(String kind,String parent) throws Exception {
        var pixels=new java.awt.image.BufferedImage(4,8,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var output=new ByteArrayOutputStream();ImageIO.write(pixels,"png",output);
        var value=new HashMap<String,Object>();value.put("kind",kind);value.put("title","Synthetic "+kind);value.put("description","Private image description");value.put("color","#E8DEF3");value.put("image",Base64.getEncoder().encodeToString(output.toByteArray()));
        if(parent!=null)value.put("parentId",parent);return value;
    }
    @Test void privateImagesAndMetadataAreIsolatedAcrossSessionsAndAccounts() throws Exception {
        String id=request(client,"POST","/library",entry("BUBBLE",null),201).get("id").asString();
        var view=request(client,"GET","/library",null,200).get("content").get(0);
        assertEquals(4,view.get("width").asInt());assertEquals(8,view.get("height").asInt());assertFalse(view.has("image"));
        assertTrue(request(client,"GET","/library/"+id+"/image",null,200).get("dataUri").asString().startsWith("data:image/jpeg;base64,"));
        var restored=new AuthTestClient(base);assertEquals(200,restored.login(emails.get(client)).statusCode());
        assertEquals(id,request(restored,"GET","/library",null,200).get("content").get(0).get("id").asString());
        request(restored,"GET","/library/"+id+"/image",null,200);
        var stranger=account();request(stranger,"GET","/library/"+id+"/image",null,404);
        request(stranger,"PATCH","/library/"+id,Map.of("title","Intrusion","description","","color","#E8DEF3"),404);
        request(stranger,"DELETE","/library/"+id,null,404);
        request(stranger,"POST","/library",entry("PHOTO",id),404);
        assertEquals(1,request(client,"GET","/library",null,200).get("totalElements").asInt());
    }
    @Test void rootAndNestedContentPersistAndRemovingCollectionPreservesAllContents() throws Exception {
        String parent=request(client,"POST","/library",entry("BUBBLE",null),201).get("id").asString();
        String child=request(client,"POST","/library",entry("BUBBLE",parent),201).get("id").asString();
        String photo=request(client,"POST","/library",entry("PHOTO",parent),201).get("id").asString();
        String note=request(client,"POST","/library/notes",Map.of("note",Map.of("title","Nested note","content","kept"),"bubbleId",parent),201).get("id").asString();
        String list=request(client,"POST","/library/checklists",Map.of("checklist",Map.of("title","Nested list","items",List.of(Map.of("content","Done","completed",true))),"bubbleId",parent),201).get("id").asString();
        request(client,"POST","/library/notes",Map.of("note",Map.of("title","Home note","content","outside collections")),201);
        assertEquals(2,request(client,"GET","/library/placements",null,200).get("totalElements").asInt());
        request(client,"DELETE","/library/"+parent,null,204);
        assertEquals(0,request(client,"GET","/library/placements",null,200).get("totalElements").asInt());
        assertEquals("kept",request(client,"GET","/notes/"+note,null,200).get("content").asString());
        assertTrue(request(client,"GET","/checklists/"+list,null,200).get("items").get(0).get("completed").asBoolean());
        var entries=request(client,"GET","/library",null,200).get("content");assertEquals(2,entries.size());
        for(var value:entries)assertTrue(value.get("parentId").isNull());
        request(client,"GET","/library/"+photo+"/image",null,200);
        assertTrue(entries.toString().contains(child));
    }
    @Test void invalidImagesAndForeignDestinationsCannotCreatePartialRecords() throws Exception {
        var missing=entry("BUBBLE",null);missing.remove("image");request(client,"POST","/library",missing,400);
        var fake=entry("BUBBLE",null);fake.put("image",Base64.getEncoder().encodeToString("<svg/>".getBytes()));request(client,"POST","/library",fake,400);
        request(client,"POST","/library/notes",Map.of("note",Map.of("title","Must not save","content","private"),"bubbleId",UUID.randomUUID().toString()),404);
        assertEquals(0,request(client,"GET","/notes",null,200).get("totalElements").asInt());
        assertEquals(0,request(client,"GET","/library",null,200).get("totalElements").asInt());
        var unsigned=HttpRequest.newBuilder(URI.create(base+"/api/v1/library")).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(AuthTestClient.JSON.writeValueAsString(entry("PHOTO",null))));
        assertEquals(403,client.send(unsigned).statusCode());
    }
    @Test void photosAndBubblesSupportEditingAndPinning() throws Exception {
        String photo=request(client,"POST","/library",entry("PHOTO",null),201).get("id").asString();
        var edited=request(client,"PATCH","/library/"+photo,Map.of("title","Updated photo","description","searchable words","color","#E8DEF3"),200);
        assertEquals("Updated photo",edited.get("title").asString());
        assertTrue(request(client,"PUT","/library/"+photo+"/pin",Map.of("pinned",true),200).get("pinned").asBoolean());
        assertFalse(request(client,"PUT","/library/"+photo+"/pin",Map.of("pinned",false),200).get("pinned").asBoolean());
    }
}
