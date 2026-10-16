package com.bubble.service;

import com.bubble.dto.AccountResponse;
import com.bubble.dto.RegisterRequest;
import com.bubble.entity.User;
import com.bubble.entity.UserPreferences;
import com.bubble.repository.UserPreferencesRepository;
import com.bubble.repository.UserRepository;
import java.util.UUID;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final UserPreferencesRepository preferences;
    public AccountService(UserRepository users, PasswordEncoder encoder,
            UserPreferencesRepository preferences) {
        this.users = users; this.encoder = encoder; this.preferences = preferences;
    }

    @Transactional
    public AccountResponse register(RegisterRequest input) {
        User user = new User(input.email(), input.displayName().trim());
        user.initializePasswordHash(encoder.encode(input.password()));
        // Flush inside the transaction: the unique constraint resolves concurrent registrations safely.
        users.saveAndFlush(user);
        preferences.saveAndFlush(new UserPreferences(user));
        return response(user);
    }

    @Transactional(readOnly = true)
    public AccountResponse current(UUID id) {
        return response(users.findById(id).orElseThrow(() -> new UsernameNotFoundException("Invalid credentials.")));
    }

    private AccountResponse response(User user) {
        return new AccountResponse(user.getId(), user.getEmail(), user.getProfile().getDisplayName(), user.getCreatedAt());
    }
}
