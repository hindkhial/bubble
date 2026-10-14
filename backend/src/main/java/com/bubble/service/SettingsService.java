package com.bubble.service;

import com.bubble.dto.SettingsDtos.*;
import com.bubble.entity.Profile;
import com.bubble.entity.UserPreferences;
import com.bubble.exception.ResourceNotFoundException;
import com.bubble.repository.ProfileRepository;
import com.bubble.repository.UserPreferencesRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SettingsService {
    private final ProfileRepository profiles;
    private final UserPreferencesRepository preferences;
    public SettingsService(ProfileRepository profiles, UserPreferencesRepository preferences) {
        this.profiles = profiles;
        this.preferences = preferences;
    }
    @Transactional(readOnly = true)
    public ProfileView profile(UUID owner) {
        return view(profiles.findByUser_Id(owner).orElseThrow(ResourceNotFoundException::new));
    }
    public ProfileView patchProfile(UUID owner, ProfilePatch input) {
        if (input.displayName == null && !input.hasBio() && !input.hasAvatar()) throw new IllegalArgumentException();
        var profile = profiles.lockOwned(owner).orElseThrow(ResourceNotFoundException::new);
        if (input.displayName != null) profile.setDisplayName(input.displayName.trim());
        if (input.hasBio()) profile.setBio(input.bio());
        if (input.hasAvatar()) profile.setAvatarReference(input.avatarReference());
        profiles.flush();
        return view(profile);
    }
    @Transactional(readOnly = true)
    public PreferencesView preferences(UUID owner) {
        return view(preferences.findByUser_Id(owner).orElseThrow(ResourceNotFoundException::new));
    }
    public PreferencesView patchPreferences(UUID owner, PreferencesPatch input) {
        if (input.themeMode == null && input.accentColor == null) throw new IllegalArgumentException();
        var value = preferences.lockOwned(owner).orElseThrow(ResourceNotFoundException::new);
        if (input.themeMode != null) value.setThemeMode(input.themeMode);
        if (input.accentColor != null) value.setAccentColor(input.accentColor);
        preferences.flush();
        return view(value);
    }
    private ProfileView view(Profile p) {
        return new ProfileView(p.getDisplayName(), p.getBio(), p.getAvatarReference(), p.getCreatedAt(), p.getUpdatedAt());
    }
    private PreferencesView view(UserPreferences p) {
        return new PreferencesView(p.getThemeMode(), p.getAccentColor(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
