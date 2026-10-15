package com.bubble.security;

import com.bubble.repository.UserRepository;
import java.util.Locale;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDetailsService implements UserDetailsService {
    private final UserRepository users;
    public AccountDetailsService(UserRepository users) { this.users = users; }

    @Override @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        var user = users.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
                .filter(account -> account.hasPassword())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials."));
        return new AccountPrincipal(user.getId(), user.getEmail(), user.getPasswordHash());
    }
}
