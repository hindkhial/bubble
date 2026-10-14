package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity @Table(name = "notes")
public class Note extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;
    @NotBlank @Size(max = 100) @Column(nullable = false, length = 100)
    private String title;
    @NotNull @Column(nullable = false, columnDefinition = "text")
    private String content;
    @Column(name = "is_pinned", nullable = false)
    private boolean pinned;

    protected Note() {}
    public Note(User user, String title, String content) { this.user = user; this.title = title; this.content = content; }
    public User getUser() { return user; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getContent() { return content; }
    public void setContent(String value) { content = value; }
    public boolean isPinned() { return pinned; }
    public void setPinned(boolean value) { pinned = value; }
}
