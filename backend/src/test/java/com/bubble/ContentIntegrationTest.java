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

class ContentIntegrationTest {
    static ConfigurableApplicationContext context;
    static String base;
    AuthTestClient client;
    String email;
    @BeforeAll static void start() {
        context=PostgresTestDatabase.start(BubbleApplication.class);
        base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();
    }
    @AfterAll static void stop() { if(context!=null)context.close(); }
    @BeforeEach void account() throws Exception {
        client=new AuthTestClient(base); email=UUID.randomUUID()+"@example.test";
        assertEquals(201,client.register(email).statusCode()); assertEquals(200,client.login(email).statusCode());
    }
    HttpResponse<String> request(AuthTestClient who,String method,String path,Object body) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create(base+path));
        if(!method.equals("GET"))builder.header("X-CSRF-TOKEN",who.csrf());
        builder.header("Content-Type","application/json").method(method,body==null?HttpRequest.BodyPublishers.noBody():
                HttpRequest.BodyPublishers.ofString(AuthTestClient.JSON.writeValueAsString(body)));
        return who.send(builder);
    }
    JsonNode result(String method,String path,Object body,int expected) throws Exception {
        var response=request(client,method,path,body);
        assertEquals(expected,response.statusCode(),response.body());
        return expected==204?null:AuthTestClient.JSON.readTree(response.body());
    }
    String note(String title,String content,boolean pinned) throws Exception {
        return result("POST","/api/v1/notes",Map.of("title",title,"content",content,"pinned",pinned),201).get("id").asString();
    }
    String list() throws Exception { return result("POST","/api/v1/checklists",Map.of("title","Shopping"),201).get("id").asString(); }
    String item(String list,String text) throws Exception {
        return result("POST","/api/v1/checklists/"+list+"/items",Map.of("content",text),201).get("id").asString();
    }
    @Test void noteCrudPersistsAndUpdatesTimestamps() throws Exception {
        String id=note("First","private body",false);
        String path="/api/v1/notes/"+id;
        var before=result("GET",path,null,200);
        var after=result("PATCH",path,Map.of("title","Edited","content","new body","pinned",true),200);
        assertEquals("Edited",after.get("title").asString()); assertTrue(after.get("pinned").asBoolean());
        assertEquals(before.get("createdAt"),after.get("createdAt"));
        assertTrue(java.time.Instant.parse(after.get("updatedAt").asString()).isAfter(java.time.Instant.parse(before.get("updatedAt").asString())));
        assertEquals("new body",result("GET",path,null,200).get("content").asString());
        assertEquals("new body",context.getBean(com.bubble.repository.NoteRepository.class).findById(UUID.fromString(id)).orElseThrow().getContent());
        result("DELETE",path,null,204);result("GET",path,null,404);
        assertTrue(context.getBean(com.bubble.repository.NoteRepository.class).findById(UUID.fromString(id)).isEmpty());
    }
    @Test void paginationSortingPinnedFilteringAndEmptyPages() throws Exception {
        assertEquals(0,result("GET","/api/v1/notes",null,200).get("totalElements").asInt());
        String a=note("First","",false),b=note("Second","",true),c=note("Third","",true);
        var first=result("GET","/api/v1/notes?sort=createdAt&direction=asc&size=1",null,200);
        assertEquals(a,first.get("content").get(0).get("id").asString()); assertEquals(3,first.get("totalPages").asInt());
        assertEquals(b,result("GET","/api/v1/notes?sort=createdAt&direction=asc&size=1&page=1",null,200).get("content").get(0).get("id").asString());
        assertEquals(c,result("GET","/api/v1/notes",null,200).get("content").get(0).get("id").asString());
        assertEquals(2,result("GET","/api/v1/notes?pinned=true",null,200).get("totalElements").asInt());
        assertEquals(1,result("GET","/api/v1/notes?pinned=false",null,200).get("totalElements").asInt());
        assertEquals(0,result("GET","/api/v1/notes?page=10",null,200).get("content").size());
    }
    @Test void equalTimestampsHaveStableUuidOrdering() throws Exception {
        String a=note("One","",false),b=note("Two","",false);
        var jdbc=context.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
        jdbc.update("update notes set created_at = '2026-01-01T00:00:00Z', updated_at = '2026-01-01T00:00:00Z' where id in (?,?)",UUID.fromString(a),UUID.fromString(b));
        var ids=new ArrayList<>(List.of(a,b));Collections.sort(ids);
        var rows=result("GET","/api/v1/notes",null,200).get("content");
        assertEquals(ids.get(0),rows.get(0).get("id").asString());assertEquals(ids.get(1),rows.get(1).get("id").asString());
    }
    @Test void checklistCrudAndItemsUpdateParentAndKeepOrder() throws Exception {
        String id=list(),path="/api/v1/checklists/"+id;
        var before=result("GET",path,null,200);
        String a=item(id,"Apples"),b=item(id,"Bread"),c=item(id,"Coffee");
        var after=result("GET",path,null,200);
        assertTrue(java.time.Instant.parse(after.get("updatedAt").asString()).isAfter(java.time.Instant.parse(before.get("updatedAt").asString())));
        var completed=result("PATCH",path+"/items/"+b,Map.of("completed",true,"content","Brown bread"),200);
        assertTrue(completed.get("completed").asBoolean());
        var reordered=result("PUT",path+"/items/order",Map.of("itemIds",List.of(c,a,b)),200);
        assertEquals(c,reordered.get("items").get(0).get("id").asString());
        var saved=result("GET",path,null,200).get("items");
        for(int i=0;i<3;i++)assertEquals(i,saved.get(i).get("position").asInt());
        result("PATCH",path+"/items/"+b,Map.of("completed",false),200);
        result("DELETE",path+"/items/"+a,null,204);
        saved=result("GET",path,null,200).get("items");assertEquals(2,saved.size());assertEquals(1,saved.get(1).get("position").asInt());
        var edited=result("PATCH",path,Map.of("title","Weekend","pinned",true),200);assertTrue(edited.get("pinned").asBoolean());
        assertEquals(1,result("GET","/api/v1/checklists?pinned=true&size=1&sort=createdAt&direction=asc",null,200).get("totalElements").asInt());
        assertFalse(result("GET","/api/v1/checklists",null,200).get("content").get(0).has("items"));
        result("DELETE",path,null,204);result("GET",path,null,404);
        assertTrue(context.getBean(com.bubble.repository.ChecklistItemRepository.class).findById(UUID.fromString(b)).isEmpty());
    }
    @Test void invalidReordersRollbackWithoutChangingItems() throws Exception {
        String id=list(),a=item(id,"A"),b=item(id,"B"),path="/api/v1/checklists/"+id;
        for(var ids:List.of(List.of(a,a),List.of(a),List.of(a,UUID.randomUUID().toString())))
            result("PUT",path+"/items/order",Map.of("itemIds",ids),400);
        var saved=result("GET",path,null,200).get("items");
        assertEquals(a,saved.get(0).get("id").asString());assertEquals(b,saved.get(1).get("id").asString());
        String empty=list();result("PUT","/api/v1/checklists/"+empty+"/items/order",Map.of("itemIds",List.of()),200);
    }
    @Test void searchMatchesAllContentWithoutDuplicatesAndEscapesWildcards() throws Exception {
        note("Lavender","private text",false);note("Other","LAVENDER body",false);note("Literal","100%_done",false);
        assertEquals(2,result("GET","/api/v1/notes?q=lAvEnDeR",null,200).get("totalElements").asInt());
        assertEquals(1,result("GET","/api/v1/notes?q=%25_",null,200).get("totalElements").asInt());
        String id=list();item(id,"Lavender milk");item(id,"lavender tea");
        assertEquals(1,result("GET","/api/v1/checklists?q=LAVENDER",null,200).get("totalElements").asInt());
        result("PATCH","/api/v1/checklists/"+id,Map.of("title","Lavender"),200);
        assertEquals(1,result("GET","/api/v1/checklists?q=lavender",null,200).get("totalElements").asInt());
        assertEquals(0,result("GET","/api/v1/notes?q=nonexistent",null,200).get("totalElements").asInt());
    }
    @Test void everyResourceOperationEnforcesOwnership() throws Exception {
        String note=note("Hidden","secret",false),list=list(),item=item(list,"secret item");
        var stranger=new AuthTestClient(base);String email=UUID.randomUUID()+"@example.test";
        stranger.register(email);stranger.login(email);
        for(String path:List.of("/api/v1/notes/"+note,"/api/v1/checklists/"+list)) {
            assertEquals(404,request(stranger,"GET",path,null).statusCode());
            assertEquals(404,request(stranger,"PATCH",path,Map.of("title","Attack")).statusCode());
            assertEquals(404,request(stranger,"DELETE",path,null).statusCode());
        }
        String path="/api/v1/checklists/"+list;
        assertEquals(404,request(stranger,"POST",path+"/items",Map.of("content","Attack")).statusCode());
        assertEquals(404,request(stranger,"PATCH",path+"/items/"+item,Map.of("completed",true)).statusCode());
        assertEquals(404,request(stranger,"DELETE",path+"/items/"+item,null).statusCode());
        assertEquals(404,request(stranger,"PUT",path+"/items/order",Map.of("itemIds",List.of(item))).statusCode());
        assertEquals(0,AuthTestClient.JSON.readTree(stranger.get("/api/v1/notes?q=secret").body()).get("totalElements").asInt());
        assertEquals(0,AuthTestClient.JSON.readTree(stranger.get("/api/v1/checklists?q=secret").body()).get("totalElements").asInt());
        String other=list();
        result("PATCH","/api/v1/checklists/"+other+"/items/"+item,Map.of("completed",true),404);
        result("DELETE","/api/v1/checklists/"+other+"/items/"+item,null,404);
        result("GET","/api/v1/notes/"+note,null,200);
    }
    @Test void invalidInputsReturnClientErrors() throws Exception {
        for(String query:List.of("page=-1","size=0","size=101","sort=title","direction=sideways","pinned=perhaps","page=abc"))
            result("GET","/api/v1/notes?"+query,null,400);
        result("GET","/api/v1/notes/not-a-uuid",null,400);
        result("POST","/api/v1/notes",Map.of("title"," ","content","body"),400);
        result("POST","/api/v1/notes",Map.of("title","Title"),400);
        result("POST","/api/v1/notes",Map.of("title","x".repeat(101),"content",""),400);
        String note=note("Valid","",false);
        result("PATCH","/api/v1/notes/"+note,Map.of(),400);
        result("PATCH","/api/v1/notes/"+note,Collections.singletonMap("title",null),400);
        result("POST","/api/v1/notes",Map.of("title","Title","content","","userId",UUID.randomUUID()),400);
        String list=list();
        result("POST","/api/v1/checklists/"+list+"/items",Map.of("content"," "),400);
        result("PUT","/api/v1/checklists/"+list+"/items/order",Map.of("itemIds",List.of("invalid")),400);
    }
    @Test void authenticationAndCsrfProtectAllContentRoutes() throws Exception {
        var anonymous=new AuthTestClient(base);
        assertEquals(401,anonymous.get("/api/v1/notes").statusCode());
        assertEquals(401,anonymous.get("/api/v1/checklists").statusCode());
        assertEquals(401,request(anonymous,"POST","/api/v1/notes",Map.of("title","Title","content","" )).statusCode());
        String id=note("Original","",false);
        var response=client.send(HttpRequest.newBuilder(URI.create(base+"/api/v1/notes/"+id))
                .header("Content-Type","application/json").method("PATCH",HttpRequest.BodyPublishers.ofString("{\"title\":\"Attack\"}")));
        assertEquals(403,response.statusCode());
    }
    @Test void completeChecklistDraftIsAtomicAndOwnerScoped() throws Exception {
        var created=result("POST","/api/v1/checklists/with-items",Map.of("title","Draft","items",List.of(Map.of("content","One","completed",true),Map.of("content","Two","completed",false))),201);
        String id=created.get("id").asString(),first=created.get("items").get(0).get("id").asString(),second=created.get("items").get(1).get("id").asString();
        var saved=result("PUT","/api/v1/checklists/"+id+"/content",Map.of("title","Edited","items",List.of(Map.of("id",second,"content","Two changed","completed",true),Map.of("id",first,"content","One","completed",false))),200);
        assertEquals(second,saved.get("items").get(0).get("id").asString());assertTrue(saved.get("items").get(0).get("completed").asBoolean());
        result("PUT","/api/v1/checklists/"+id+"/content",Map.of("title","Must roll back","items",List.of(Map.of("id",UUID.randomUUID(),"content","Invalid","completed",false))),400);
        assertEquals("Edited",result("GET","/api/v1/checklists/"+id,null,200).get("title").asString());
        var other=new AuthTestClient(base);String email=emailForDraft();other.register(email);other.login(email);
        assertEquals(404,request(other,"PUT","/api/v1/checklists/"+id+"/content",Map.of("title","Attack","items",List.of())).statusCode());
    }
    String emailForDraft(){return UUID.randomUUID()+"@example.test";}
    @Test void concurrentAppendsAndReordersKeepUniquePositions() throws Exception {
        String id=list();
        var second=new AuthTestClient(base);assertEquals(200,second.login(email).statusCode());
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->request(client,"POST","/api/v1/checklists/"+id+"/items",Map.of("content","One")));
            var b=pool.submit(()->request(second,"POST","/api/v1/checklists/"+id+"/items",Map.of("content","Two")));
            assertEquals(201,a.get(30,TimeUnit.SECONDS).statusCode());assertEquals(201,b.get(30,TimeUnit.SECONDS).statusCode());
            var rows=result("GET","/api/v1/checklists/"+id,null,200).get("items");
            var forward=List.of(rows.get(0).get("id").asString(),rows.get(1).get("id").asString());
            var reverse=List.of(forward.get(1),forward.get(0));
            var c=pool.submit(()->request(client,"PUT","/api/v1/checklists/"+id+"/items/order",Map.of("itemIds",forward)));
            var d=pool.submit(()->request(second,"PUT","/api/v1/checklists/"+id+"/items/order",Map.of("itemIds",reverse)));
            assertEquals(200,c.get(30,TimeUnit.SECONDS).statusCode());assertEquals(200,d.get(30,TimeUnit.SECONDS).statusCode());
        }
        var rows=result("GET","/api/v1/checklists/"+id,null,200).get("items");
        assertEquals(2,rows.size());assertEquals(0,rows.get(0).get("position").asInt());assertEquals(1,rows.get(1).get("position").asInt());
    }
}
