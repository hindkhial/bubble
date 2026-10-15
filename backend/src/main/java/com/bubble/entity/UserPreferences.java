package com.bubble.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "user_preferences")
public class UserPreferences extends BaseEntity {
    public enum ThemeMode { LIGHT, DARK, SYSTEM }
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true, updatable = false)
    private User user;
    @NotNull @Enumerated(EnumType.STRING)
    @Column(name = "theme_mode", nullable = false, length = 6)
    private ThemeMode themeMode = ThemeMode.LIGHT;
    @NotNull @Pattern(regexp = "Lavender|Rose|Sage|Deep lavender|Sky blue|Dusty pink|Denim blue")
    @Column(name = "accent_color", nullable = false, length = 32)
    private String accentColor = "Lavender";

    protected UserPreferences() {}
    public UserPreferences(User user) { this.user = user; }
    public ThemeMode getThemeMode() { return themeMode; }
    public void setThemeMode(ThemeMode value) { themeMode = value; }
    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String value) { accentColor = value; }
}
