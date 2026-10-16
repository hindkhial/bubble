package com.bubble;

import com.bubble.security.AuthRequestBudget;
import com.bubble.validation.DatabaseText;
import com.bubble.exception.ApiExceptionHandler;
import ch.qos.logback.classic.*;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.jupiter.api.Assertions.*;

class SecurityUnitTest {
    @Test void budgetExpiresAndEnforcesGlobalAndPerAddressCaps() {
        var now=new AtomicLong();var budget=new AuthRequestBudget(2,3,now::get);
        assertTrue(budget.acquire("one"));assertTrue(budget.acquire("one"));assertFalse(budget.acquire("one"));
        assertTrue(budget.acquire("two"));assertFalse(budget.acquire("three"));now.set(60_000_000_000L);assertTrue(budget.acquire("one"));
        var bounded=new AuthRequestBudget(10000,100000,now::get);
        for(int i=0;i<1024;i++)assertTrue(bounded.acquire("peer"+i));assertFalse(bounded.acquire("overflow"));
    }
    @Test void concurrentBudgetCannotExceedLimit() throws Exception {
        var budget=new AuthRequestBudget(10,10);var accepted=new AtomicInteger();
        try(var pool=Executors.newFixedThreadPool(8)) {
            var futures=new java.util.ArrayList<Future<?>>();
            for(int i=0;i<100;i++)futures.add(pool.submit(()->{if(budget.acquire("same"))accepted.incrementAndGet();}));
            for(var future:futures)future.get(10,TimeUnit.SECONDS);
        }
        assertEquals(10,accepted.get());
    }
    @Test void diagnosticLogsNeverContainExceptionMessagesCausesOrPrivateData() {
        var logger=(Logger)org.slf4j.LoggerFactory.getLogger(ApiExceptionHandler.class);
        var appender=new ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();appender.start();logger.addAppender(appender);
        try {
            var error=new IllegalStateException("private-note-password",new RuntimeException("private-cause"));
            assertEquals(500,new ApiExceptionHandler().unexpected(error).getStatusCode().value());
            assertEquals(1,appender.list.size());var event=appender.list.getFirst();
            assertTrue(event.getFormattedMessage().contains("IllegalStateException"));assertFalse(event.getFormattedMessage().contains("private"));
            assertNull(event.getThrowableProxy());
        } finally {logger.detachAppender(appender);appender.stop();}
    }
    @Test void databaseTextAllowsEmojiButRejectsUnpairedSurrogatesAndNul() {
        var validator=new DatabaseText.Validator();assertTrue(validator.isValid("hello 🐱\n",null));assertTrue(validator.isValid(null,null));
        assertFalse(validator.isValid("\u0000",null));assertFalse(validator.isValid(new String(new char[]{(char)0xd800}),null));
        assertFalse(validator.isValid(new String(new char[]{(char)0xdc00}),null));
    }
}
