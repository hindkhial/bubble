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
    private final byte[] passwordVersion;

    public AccountPrincipal(UUID id, String username, String password) {
        this.id = id; this.username = username; this.password = password; this.passwordVersion = version(password);
    }
    private static byte[] version(String encoded) {
        try { return java.security.MessageDigest.getInstance("SHA-256").digest(
                (encoded == null ? "" : encoded).getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    public boolean matchesPasswordVersion(String encoded) {
        return passwordVersion != null && java.security.MessageDigest.isEqual(passwordVersion, version(encoded));
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
