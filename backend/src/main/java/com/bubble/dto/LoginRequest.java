package com.bubble.dto;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;

public record LoginRequest(@NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(max = 72) String password) {
    public LoginRequest { email = email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT); }
    @AssertTrue(message = "Password must fit within 72 UTF-8 bytes")
    public boolean isPasswordByteLengthValid() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
    @Override public String toString() { return "LoginRequest[redacted]"; }
}
