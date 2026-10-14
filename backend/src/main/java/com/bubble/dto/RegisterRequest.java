package com.bubble.dto;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;

public record RegisterRequest(@NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 12, max = 72) String password,
        @NotBlank @Size(max = 80) String displayName) {
    public RegisterRequest { email = email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT); }
    @AssertTrue(message = "Password must contain at least 12 characters and fit within 72 UTF-8 bytes")
    public boolean isPasswordByteLengthValid() {
        return password == null || (password.codePointCount(0, password.length()) >= 12
                && password.getBytes(StandardCharsets.UTF_8).length <= 72);
    }
    @Override public String toString() { return "RegisterRequest[redacted]"; }
}
