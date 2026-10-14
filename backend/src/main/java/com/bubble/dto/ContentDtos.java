package com.bubble.dto;

import com.bubble.validation.DatabaseText;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ContentDtos {
    private ContentDtos() {}
    public record NewNote(@DatabaseText @NotBlank @Size(max=100) String title,
            @DatabaseText @NotNull @Size(max=100000) String content, Boolean pinned) {}
    // Mutable input DTOs distinguish absent fields from explicitly null JSON values.
    public static final class PatchNote {
        @DatabaseText @JsonSetter(nulls=Nulls.FAIL) @Size(max=100) @Pattern(regexp="(?s).*\\S.*") public String title;
        @DatabaseText @JsonSetter(nulls=Nulls.FAIL) @Size(max=100000) public String content;
        @JsonSetter(nulls=Nulls.FAIL) public Boolean pinned;
        public String title() { return title; }
        public String content() { return content; }
        public Boolean pinned() { return pinned; }
    }
    public record NewChecklist(@DatabaseText @NotBlank @Size(max=100) String title, Boolean pinned) {}
    public static final class PatchChecklist {
        @DatabaseText @JsonSetter(nulls=Nulls.FAIL) @Size(max=100) @Pattern(regexp="(?s).*\\S.*") public String title;
        @JsonSetter(nulls=Nulls.FAIL) public Boolean pinned;
        public String title() { return title; }
        public Boolean pinned() { return pinned; }
    }
    public record NewItem(@DatabaseText @NotBlank @Size(max=10000) String content) {}
    public static final class PatchItem {
        @DatabaseText @JsonSetter(nulls=Nulls.FAIL) @Size(max=10000) @Pattern(regexp="(?s).*\\S.*") public String content;
        @JsonSetter(nulls=Nulls.FAIL) public Boolean completed;
        public String content() { return content; }
        public Boolean completed() { return completed; }
    }
    public record ItemOrder(@NotNull @Size(max=1000) List<@NotNull UUID> itemIds) {}
    public record NoteView(UUID id, String title, String content, boolean pinned, Instant createdAt, Instant updatedAt) {}
    public record ItemView(UUID id, String content, boolean completed, int position, Instant createdAt, Instant updatedAt) {}
    public record ChecklistView(UUID id, String title, boolean pinned, Instant createdAt, Instant updatedAt, List<ItemView> items) {}
    public record ChecklistSummary(UUID id, String title, boolean pinned, Instant createdAt, Instant updatedAt) {}
    public record PageView<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}
}
