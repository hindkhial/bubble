package com.bubble.dto;

import com.bubble.validation.DatabaseText;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class LibraryDtos {
    private LibraryDtos() {}
    public record NewEntry(@NotNull @Pattern(regexp="BUBBLE|PHOTO") String kind,
            @DatabaseText @NotBlank @Size(max=100) String title,
            @DatabaseText @NotNull @Size(max=100000) String description,
            UUID parentId, @NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String color,
            @NotBlank @Size(max=700000) String image) {}
    public record PatchEntry(@DatabaseText @NotBlank @Size(max=100) String title,
            @DatabaseText @NotNull @Size(max=100000) String description,
            @NotNull @Pattern(regexp="#[0-9a-fA-F]{6}") String color) {}
    public record Pin(boolean pinned) {}
    public record Entry(UUID id, String kind, String title, String description, UUID parentId,
            String color, int width, int height, boolean pinned, Instant createdAt, Instant updatedAt) {}
    public record Placement(UUID id, UUID bubbleId, UUID noteId, UUID checklistId) {}
    public record NoteDraft(@NotNull @Valid ContentDtos.NewNote note, UUID bubbleId) {}
    public record ListDraft(@NotNull @Valid ContentDtos.ChecklistDraft checklist, UUID bubbleId) {}
    public record ImageView(String dataUri) {}
}
