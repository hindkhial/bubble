package com.bubble;

import com.bubble.service.ContentService;
import java.util.*;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

class PerformanceIntegrationTest {
    static ConfigurableApplicationContext context;
    static ContentService service;
    static JdbcTemplate jdbc;
    static UUID owner, other;
    static List<UUID> ids=new ArrayList<>();
    static String base;
    @BeforeAll static void start() {
        context=PostgresTestDatabase.startWithOverrides(Map.of("spring.jpa.properties.hibernate.generate_statistics","true",
                "logging.level.org.hibernate.stat","OFF", "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener","OFF"),"test",BubbleApplication.class);
        service=context.getBean(ContentService.class);jdbc=context.getBean(JdbcTemplate.class);
        base="http://localhost:"+((WebServerApplicationContext)context).getWebServer().getPort();
        owner=UUID.randomUUID();other=UUID.randomUUID();
        for(var user:List.of(owner,other)) jdbc.update("insert into users(id,email) values (?,?)",user,user+"@example.test");
        for(int i=0;i<21;i++) {
            UUID id=UUID.randomUUID();ids.add(id);
            jdbc.update("insert into checklists(id,user_id,title) values (?,?,?)",id,owner,"Synthetic list "+i);
            jdbc.update("insert into checklist_items(checklist_id,content,position) select ?, 'Synthetic task ' || n, n from generate_series(0,24) n",id);
        }
        jdbc.update("insert into checklists(user_id,title) values (?, 'Other owner')",other);
    }
    @AfterAll static void stop() {if(context!=null)context.close();}
    @Test void detailedPagesHaveBoundedQueriesAndPreserveOrderAndIsolation() {
        var statistics=context.getBean(jakarta.persistence.EntityManagerFactory.class).unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var page=service.listsWithItems(owner,0,20,"updatedAt","desc",null,null);
        long optimized=statistics.getPrepareStatementCount();
        assertEquals(20,page.content().size());assertEquals(21,page.totalElements());assertTrue(optimized<=3,"Detailed page query budget: "+optimized);
        for(var list:page.content()) {assertEquals(25,list.items().size());for(int i=0;i<25;i++)assertEquals(i,list.items().get(i).position());}
        var second=service.listsWithItems(owner,1,20,"updatedAt","desc",null,null);
        var seen=new HashSet<UUID>();page.content().forEach(row->assertTrue(seen.add(row.id())));second.content().forEach(row->assertTrue(seen.add(row.id())));
        assertEquals(21,seen.size());
        assertEquals(1,service.listsWithItems(other,0,20,"updatedAt","desc",null,null).totalElements());
        assertEquals(0,service.listsWithItems(owner,0,20,"updatedAt","desc",null,"Other owner").totalElements());
        assertThrows(IllegalArgumentException.class,()->service.listsWithItems(owner,0,21,"updatedAt","desc",null,null));
        statistics.clear();
        var summaries=service.lists(owner,0,20,"updatedAt","desc",null,null);
        summaries.content().forEach(row->service.list(owner,row.id()));
        long reference=statistics.getPrepareStatementCount();
        assertTrue(reference>optimized);
        System.out.println("PERFORMANCE checklist page=20 rows=25 referenceSql="+reference+" optimizedSql="+optimized);
        var before=new ArrayList<Long>();var after=new ArrayList<Long>();
        for(int run=0;run<8;run++) {
            long start=System.nanoTime();var old=service.lists(owner,0,20,"updatedAt","desc",null,null);old.content().forEach(row->service.list(owner,row.id()));
            long middle=System.nanoTime();service.listsWithItems(owner,0,20,"updatedAt","desc",null,null);long end=System.nanoTime();
            if(run>0){before.add(middle-start);after.add(end-middle);}
        }
        Collections.sort(before);Collections.sort(after);
        System.out.println("PERFORMANCE checklist warmMedianMs reference="+before.get(3)/1e6+" optimized="+after.get(3)/1e6+" samples=7");
    }
    @Test void detailedPageUsesActualSecurityAndRetainsSummaryCompatibility() throws Exception {
        var client=new AuthTestClient(base);String email=UUID.randomUUID()+"@example.test";
        assertEquals(201,client.register(email).statusCode());assertEquals(200,client.login(email).statusCode());
        var user=AuthTestClient.JSON.readTree(client.get("/api/v1/users/me").body()).get("id").asString();
        var list=UUID.randomUUID();jdbc.update("insert into checklists(id,user_id,title) values (?,?,?)",list,UUID.fromString(user),"Owned");
        jdbc.update("insert into checklist_items(checklist_id,content,position) select ?, 'Large task ' || n, n from generate_series(0,999) n",list);
        var detailed=client.get("/api/v1/checklists?includeItems=true&q=Large%20task%20999");assertEquals(200,detailed.statusCode());
        var content=AuthTestClient.JSON.readTree(detailed.body()).get("content");assertEquals(1,content.size());assertEquals(1000,content.get(0).get("items").size());
        assertFalse(AuthTestClient.JSON.readTree(client.get("/api/v1/checklists").body()).get("content").get(0).has("items"));
        assertEquals(400,client.get("/api/v1/checklists?includeItems=true&size=21").statusCode());
        assertEquals(401,new AuthTestClient(base).get("/api/v1/checklists?includeItems=true").statusCode());
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(4)) {
            var futures=new ArrayList<java.util.concurrent.Future<Integer>>();
            for(int i=0;i<8;i++) futures.add(pool.submit(()->{
                var response=client.get("/api/v1/checklists?includeItems=true");
                assertEquals(200,response.statusCode());
                var rows=AuthTestClient.JSON.readTree(response.body()).get("content");
                assertEquals(1,rows.size());assertEquals(list.toString(),rows.get(0).get("id").asString());
                return rows.get(0).get("items").size();
            }));
            for(var future:futures)assertEquals(1000,future.get());
        }
    }
    @Test void existingOwnerSortIndexSupportsLargeNotePages() {
        jdbc.update("insert into notes(user_id,title,content) select ?, 'Synthetic note ' || n, repeat('x',200) from generate_series(1,10000) n",owner);
        jdbc.execute("analyze notes");
        String plan=jdbc.queryForObject("explain (format json) select id,title,content from notes where user_id=? order by updated_at desc,id limit 20",String.class,owner);
        assertTrue(plan.contains("idx_notes_owner_updated"));
        System.out.println("PERFORMANCE notes=10000 limit=20 existingOwnerUpdatedIndex=true");
    }
}
