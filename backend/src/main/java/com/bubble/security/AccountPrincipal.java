package com.bubble.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Session identity contains no JPA entities; the provider erases the encoded credential after login. */
public final class AccountPrincipal implements UserDetails, CredentialsContainer {
    private static final long serialVersionUID = 1L;
    private final UUID id;
    private final String username;
    private String password;

    public AccountPrincipal(UUID id, String username, String password) {
        this.id = id; this.username = username; this.password = password;
    }
    public UUID id() { return id; }
    @Override public String getUsername() { return username; }
    @Override public String getPassword() { return password; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }
    @Override public void eraseCredentials() { password = null; }
    @Override public String toString() { return "AccountPrincipal[redacted]"; }
}
