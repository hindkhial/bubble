package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity @Table(name = "checklists")
public class Checklist extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;
    @NotBlank @Size(max = 100) @Column(nullable = false, length = 100)
    private String title;
    @Column(name = "is_pinned", nullable = false)
    private boolean pinned;
    @OneToMany(mappedBy = "checklist", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @OrderBy("position ASC")
    private List<ChecklistItem> items = new ArrayList<>();

    protected Checklist() {}
    public Checklist(User user, String title) { this.user = user; this.title = title; }
    public void touch() { updateTimestamp(); }
    public User getUser() { return user; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public boolean isPinned() { return pinned; }
    public void setPinned(boolean value) { pinned = value; }
    public List<ChecklistItem> getItems() { return Collections.unmodifiableList(items); }
    public ChecklistItem addItem(String content, int position) {
        ChecklistItem item = new ChecklistItem(this, content, position);
        items.add(item);
        return item;
    }
}
