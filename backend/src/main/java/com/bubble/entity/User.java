package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Entity @Table(name = "users")
public class User extends BaseEntity {
    @NotBlank @Email @Size(max = 320)
    @Column(nullable = false, unique = true, length = 320)
    private String email;
    // Encoded values only; raw passwords are accepted exclusively by the auth DTOs.
    @Column(name = "password_hash", length = 255)
    private String passwordHash;
    @OneToOne(mappedBy = "user", optional = false, fetch = FetchType.LAZY,
            cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    private Profile profile;
    @OneToMany(mappedBy = "user")
    private List<Note> notes = new ArrayList<>();
    @OneToMany(mappedBy = "user")
    private List<Checklist> checklists = new ArrayList<>();

    protected User() {}
    public User(String email, String displayName) {
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.profile = new Profile(this, displayName);
    }
    public String getEmail() { return email; }
    public boolean hasPassword() { return passwordHash != null; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getPasswordHash() { return passwordHash; }
    public void initializePasswordHash(String encoded) {
        if (passwordHash != null) throw new IllegalStateException("Password is already initialized.");
        if (encoded == null || !encoded.matches("\\{bcrypt}\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}")) {
            throw new IllegalArgumentException("An encoded password is required.");
        }
        passwordHash = encoded;
    }
    public void replacePasswordHash(String encoded) {
        if (encoded == null || !encoded.startsWith("{bcrypt}$2")) throw new IllegalArgumentException("An encoded password is required.");
        passwordHash = encoded;
    }
    public Profile getProfile() { return profile; }
    public List<Note> getNotes() { return Collections.unmodifiableList(notes); }
    public List<Checklist> getChecklists() { return Collections.unmodifiableList(checklists); }
}
