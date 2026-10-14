package com.bubble.dto;

import com.bubble.validation.DatabaseText;

import com.bubble.entity.UserPreferences.ThemeMode;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.*;
import java.time.Instant;

public final class SettingsDtos {
    private SettingsDtos() {}
    public record ProfileView(String displayName, String bio, String avatarReference,
            Instant createdAt, Instant updatedAt) {}
    public record PreferencesView(ThemeMode themeMode, String accentColor, Instant createdAt, Instant updatedAt) {}

    public static final class ProfilePatch {
        @JsonSetter(nulls = Nulls.FAIL)
        @DatabaseText @Size(max = 80) @Pattern(regexp = "(?s).*\\S.*")
        public String displayName;
        @DatabaseText @Size(max = 160)
        private String bio;
        @Pattern(regexp = "avatar:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
        private String avatarReference;
        private boolean bioPresent;
        private boolean avatarPresent;
        @JsonSetter("bio")
        public void setBio(String value) { bio = value; bioPresent = true; }
        @JsonSetter("avatarReference")
        public void setAvatarReference(String value) { avatarReference = value; avatarPresent = true; }
        public String bio() { return bio; }
        public String avatarReference() { return avatarReference; }
        public boolean hasBio() { return bioPresent; }
        public boolean hasAvatar() { return avatarPresent; }
    }
    public static final class PreferencesPatch {
        @JsonSetter(nulls = Nulls.FAIL)
        public ThemeMode themeMode;
        @JsonSetter(nulls = Nulls.FAIL)
        @Pattern(regexp = "Lavender|Rose|Sage|Deep lavender|Sky blue|Dusty pink|Denim blue")
        public String accentColor;
    }
}
