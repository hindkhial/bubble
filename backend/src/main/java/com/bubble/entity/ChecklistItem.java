package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity @Table(name = "checklist_items")
public class ChecklistItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checklist_id", nullable = false, updatable = false)
    private Checklist checklist;
    @NotBlank @Column(nullable = false, columnDefinition = "text")
    private String content;
    @Column(name = "is_completed", nullable = false)
    private boolean completed;
    @Min(0) @Column(nullable = false)
    private int position;

    protected ChecklistItem() {}
    public ChecklistItem(Checklist checklist, String content, int position) {
        this.checklist = checklist; this.content = content; this.position = position;
    }
    public Checklist getChecklist() { return checklist; }
    public String getContent() { return content; }
    public void setContent(String value) { content = value; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean value) { completed = value; }
    public int getPosition() { return position; }
    public void setPosition(int value) { position = value; }
}
