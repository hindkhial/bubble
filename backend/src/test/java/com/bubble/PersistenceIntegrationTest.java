package com.bubble;

import com.bubble.entity.*;
import com.bubble.repository.*;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

class PersistenceIntegrationTest {
    private static ConfigurableApplicationContext context;
    private static TransactionTemplate transaction;
    private static UserRepository users;
    private static ProfileRepository profiles;
    private static NoteRepository notes;
    private static ChecklistRepository checklists;
    private static ChecklistItemRepository items;
    private static JdbcTemplate jdbc;

    @BeforeAll
    static void start() {
        context = PostgresTestDatabase.start(BubbleApplication.class);
        transaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        users = context.getBean(UserRepository.class);
        profiles = context.getBean(ProfileRepository.class);
        notes = context.getBean(NoteRepository.class);
        checklists = context.getBean(ChecklistRepository.class);
        items = context.getBean(ChecklistItemRepository.class);
        jdbc = context.getBean(JdbcTemplate.class);
    }

    @AfterAll static void stop() { if (context != null) context.close(); }
    private <T> T tx(Supplier<T> action) { return transaction.execute(status -> action.get()); }
    private User user() { return users.saveAndFlush(new User(UUID.randomUUID() + "@example.test", "Bubble")); }

    @Test
    void flywayCreatesSchemaAndHibernateValidatesIt() {
        var flyway = context.getBean(Flyway.class);
        assertEquals("2", flyway.info().current().getVersion().toString());
        assertEquals(2, flyway.info().applied().length);
        assertEquals(0, flyway.info().pending().length);
        assertEquals(6, jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','profiles','notes','checklists','checklist_items','user_preferences')", Integer.class));
        assertTrue(context.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto").equals("validate"));
    }

    @Test
    void userAndProfilePersistTogetherWithCustomizationAndNoPassword() {
        var id = tx(() -> {
            User user = user();
            user.getProfile().setBio("A quiet space");
            user.getProfile().setAvatarColor("#DFA4BE");
            user.getProfile().setAvatarEmoji("🦊");
            user.getProfile().setAvatarReference("local-avatar-reference");
            return user.getId();
        });
        tx(() -> {
            User user = users.findById(id).orElseThrow();
            assertFalse(user.hasPassword());
            assertEquals(user.getId(), user.getProfile().getUser().getId());
            Profile profile = profiles.findByUser_Id(id).orElseThrow();
            assertEquals("🦊", profile.getAvatarEmoji());
            assertEquals("A quiet space", profile.getBio());
            assertNotNull(profile.getCreatedAt());
            return null;
        });
        assertNull(jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, id));
    }

    @Test
    void notesAndListsUseOwnerScopedQueries() {
        var ids = tx(() -> {
            User owner = user(); User other = user();
            Note note = notes.saveAndFlush(new Note(owner, "A thought", "Private content"));
            Checklist list = checklists.saveAndFlush(new Checklist(owner, "A list"));
            return List.of(owner.getId(), other.getId(), note.getId(), list.getId());
        });
        tx(() -> {
            assertTrue(notes.findByIdAndUser_Id(ids.get(2), ids.get(0)).isPresent());
            assertTrue(notes.findByIdAndUser_Id(ids.get(2), ids.get(1)).isEmpty());
            assertTrue(checklists.findByIdAndUser_Id(ids.get(3), ids.get(1)).isEmpty());
            assertEquals(1, notes.findAllByUser_IdOrderByUpdatedAtDescIdAsc(ids.get(0)).size());
            assertEquals(1, checklists.findAllByUser_IdOrderByUpdatedAtDescIdAsc(ids.get(0)).size());
            assertEquals(1, users.findById(ids.get(0)).orElseThrow().getNotes().size());
            assertEquals(1, users.findById(ids.get(0)).orElseThrow().getChecklists().size());
            return null;
        });
    }

    @Test
    void checklistItemsPersistInOrderAndRespectOwnership() {
        var ids = tx(() -> {
            User owner = user(); User other = user();
            Checklist list = new Checklist(owner, "Groceries");
            list.addItem("Second", 1).setCompleted(true);
            list.addItem("First", 0);
            checklists.saveAndFlush(list);
            return List.of(owner.getId(), other.getId(), list.getId());
        });
        tx(() -> {
            var rows = items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(ids.get(2), ids.get(0));
            assertEquals(List.of("First", "Second"), rows.stream().map(ChecklistItem::getContent).toList());
            assertTrue(rows.get(1).isCompleted());
            assertFalse(rows.get(0).isCompleted());
            assertTrue(items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(ids.get(2), ids.get(1)).isEmpty());
            assertTrue(items.findByIdAndChecklist_User_Id(rows.getFirst().getId(), ids.get(1)).isEmpty());
            assertEquals("First", checklists.findById(ids.get(2)).orElseThrow().getItems().getFirst().getContent());
            return null;
        });
    }

    @Test
    void timestampsAdvanceWithoutChangingCreationTime() {
        var id = tx(() -> notes.saveAndFlush(new Note(user(), "Before", "A thought")).getId());
        var before = notes.findById(id).orElseThrow();
        tx(() -> { var note = notes.findById(id).orElseThrow(); note.setTitle("After"); return null; });
        var after = notes.findById(id).orElseThrow();
        assertNotNull(before.getCreatedAt());
        assertEquals(before.getCreatedAt(), after.getCreatedAt());
        assertTrue(after.getUpdatedAt().isAfter(before.getUpdatedAt()));
        var rowId = tx(() -> {
            var list = new Checklist(user(), "Checklist"); var item = list.addItem("Task", 0);
            checklists.saveAndFlush(list); return item.getId();
        });
        var rowBefore = items.findById(rowId).orElseThrow();
        tx(() -> { items.findById(rowId).orElseThrow().setCompleted(true); return null; });
        assertTrue(items.findById(rowId).orElseThrow().getUpdatedAt().isAfter(rowBefore.getUpdatedAt()));
    }

    @Test
    void databaseEnforcesUniqueEmailProfileAndItemPosition() {
        var id = tx(() -> user().getId());
        var email = users.findById(id).orElseThrow().getEmail();
        assertTrue(users.findByEmailIgnoreCase(email.toUpperCase()).isPresent());
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO users(email) VALUES (?)", email));
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO profiles(user_id, display_name) VALUES (?, 'Duplicate')", id));
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO users(email) VALUES (?)", email.toUpperCase()));
        var listId = tx(() -> checklists.saveAndFlush(new Checklist(users.findById(id).orElseThrow(), "Unique positions")).getId());
        jdbc.update("INSERT INTO checklist_items(checklist_id, content, position) VALUES (?, 'First', 0)", listId);
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO checklist_items(checklist_id, content, position) VALUES (?, 'Duplicate', 0)", listId));
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO checklist_items(checklist_id, content, position) VALUES (?, 'Negative', -1)", listId));
    }

    @Test
    void foreignKeysAndParentDeletionPreserveDependentData() {
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO notes(user_id, title, content) VALUES (?, 'Orphan', '')", UUID.randomUUID()));
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO profiles(user_id, display_name) VALUES (?, 'Orphan')", UUID.randomUUID()));
        assertThrows(DataAccessException.class, () -> jdbc.update("INSERT INTO checklist_items(checklist_id, content, position) VALUES (?, 'Orphan', 0)", UUID.randomUUID()));
        var ids = tx(() -> {
            var owner = user(); var list = new Checklist(owner, "Keep my data");
            list.addItem("Keep this item", 0); checklists.saveAndFlush(list);
            return List.of(owner.getId(), list.getId());
        });
        assertThrows(DataAccessException.class, () -> tx(() -> { users.deleteById(ids.get(0)); users.flush(); return null; }));
        assertThrows(DataAccessException.class, () -> tx(() -> { checklists.deleteById(ids.get(1)); checklists.flush(); return null; }));
        assertTrue(checklists.existsById(ids.get(1)));
        assertEquals(1, items.findByChecklist_IdAndChecklist_User_IdOrderByPositionAsc(ids.get(1), ids.get(0)).size());
    }
}
