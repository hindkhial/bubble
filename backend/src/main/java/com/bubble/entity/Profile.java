package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity @Table(name = "profiles")
public class Profile extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true, updatable = false)
    private User user;
    @NotBlank @Size(max = 80)
    @Column(name = "display_name", nullable = false, length = 80)
    private String displayName;
    @Size(max = 160) @Column(length = 160)
    private String bio;
    @Column(name = "avatar_reference", columnDefinition = "text")
    private String avatarReference;
    @Size(max = 32) @Column(name = "avatar_color", length = 32)
    private String avatarColor;
    @Size(max = 32) @Column(name = "avatar_emoji", length = 32)
    private String avatarEmoji;

    protected Profile() {}
    public Profile(User user, String displayName) { this.user = user; this.displayName = displayName; }
    public User getUser() { return user; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String value) { displayName = value; }
    public String getBio() { return bio; }
    public void setBio(String value) { bio = value; }
    public String getAvatarReference() { return avatarReference; }
    public void setAvatarReference(String value) { avatarReference = value; }
    public String getAvatarColor() { return avatarColor; }
    public void setAvatarColor(String value) { avatarColor = value; }
    public String getAvatarEmoji() { return avatarEmoji; }
    public void setAvatarEmoji(String value) { avatarEmoji = value; }
}
