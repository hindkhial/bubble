package com.bubble;

import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PreferencesMigrationIntegrationTest {
    @Test void migrationBackfillsDefaultsPreservesDataAndEnforcesConstraints() throws Exception {
        try(var context=PostgresTestDatabase.start(BubbleApplication.class)) {
            var source=context.getBean(DataSource.class);
            String schema="migration_"+UUID.randomUUID().toString().replace("-","");
            try {
                Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).target("1").load().migrate();
                UUID owner=UUID.randomUUID();
                try(var connection=source.getConnection()) {
                    connection.setSchema(schema);
                    try(var statement=connection.prepareStatement("insert into users (id,email) values (?,?)")) {
                        statement.setObject(1,owner);statement.setString(2,"migration@example.test");statement.executeUpdate();
                    }
                    try(var statement=connection.prepareStatement("insert into profiles(user_id,display_name,bio,avatar_reference) values (?, 'Original', 'Keep me', 'legacy-reference')")) {
                        statement.setObject(1,owner);statement.executeUpdate();
                    }
                    try(var statement=connection.prepareStatement("insert into notes(user_id,title,content) values (?, 'Keep note', 'Private content')")) {
                        statement.setObject(1,owner);statement.executeUpdate();
                    }
                }
                var migration=Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).load();
                assertEquals(2,migration.migrate().migrationsExecuted);
                assertEquals(0,migration.migrate().migrationsExecuted);
                try(var connection=source.getConnection()) {
                    connection.setSchema(schema);
                    try(var statement=connection.createStatement();var rows=statement.executeQuery("select theme_mode,accent_color from user_preferences")) {
                        assertTrue(rows.next());assertEquals("LIGHT",rows.getString(1));assertEquals("Lavender",rows.getString(2));assertFalse(rows.next());
                    }
                    try(var statement=connection.createStatement();var rows=statement.executeQuery("select display_name,bio,avatar_reference from profiles")) {
                        assertTrue(rows.next());assertEquals("Original",rows.getString(1));assertEquals("Keep me",rows.getString(2));assertEquals("legacy-reference",rows.getString(3));
                    }
                    try(var statement=connection.createStatement();var rows=statement.executeQuery("select content from notes")) {
                        assertTrue(rows.next());assertEquals("Private content",rows.getString(1));
                    }
                    try(var statement=connection.createStatement()) {
                        assertThrows(java.sql.SQLException.class,()->statement.executeUpdate("update user_preferences set theme_mode='INVALID'"));
                        assertThrows(java.sql.SQLException.class,()->statement.executeUpdate("update user_preferences set accent_color='INVALID'"));
                        assertThrows(java.sql.SQLException.class,()->statement.executeUpdate("insert into user_preferences(user_id) select user_id from user_preferences"));
                        assertThrows(java.sql.SQLException.class,()->statement.executeUpdate("insert into user_preferences(user_id) values ('11111111-1111-4111-8111-111111111111')"));
                        assertThrows(java.sql.SQLException.class,()->statement.executeUpdate("delete from users"));
                    }
                }
            } finally {
                try(var connection=source.getConnection();var statement=connection.createStatement()) {
                    statement.execute("drop schema if exists "+schema+" cascade");
                }
            }
        }
    }
}
