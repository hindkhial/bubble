package com.bubble.controller;

import com.bubble.dto.SettingsDtos.*;
import com.bubble.security.AccountPrincipal;
import com.bubble.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SettingsController {
    private final SettingsService service;
    public SettingsController(SettingsService service) { this.service = service; }
    @GetMapping("/profile")
    public ProfileView profile(@AuthenticationPrincipal AccountPrincipal user) { return service.profile(user.id()); }
    @PatchMapping("/profile")
    public ProfileView patchProfile(@AuthenticationPrincipal AccountPrincipal user, @Valid @RequestBody ProfilePatch input) {
        return service.patchProfile(user.id(), input);
    }
    @GetMapping("/preferences")
    public PreferencesView preferences(@AuthenticationPrincipal AccountPrincipal user) { return service.preferences(user.id()); }
    @PatchMapping("/preferences")
    public PreferencesView patchPreferences(@AuthenticationPrincipal AccountPrincipal user, @Valid @RequestBody PreferencesPatch input) {
        return service.patchPreferences(user.id(), input);
    }
}
