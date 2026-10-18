package com.bubble.dto;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;

public record ChangePasswordRequest(@NotBlank @Size(max = 72) String currentPassword,
        @NotBlank @Size(min = 12, max = 72) String newPassword) {
    @AssertTrue(message = "Password must contain at least 12 characters and fit within 72 UTF-8 bytes")
    public boolean isPasswordLengthValid() {
        return newPassword == null || (newPassword.codePointCount(0, newPassword.length()) >= 12
                && newPassword.getBytes(StandardCharsets.UTF_8).length <= 72);
    }
    @Override public String toString() { return "ChangePasswordRequest[redacted]"; }
}
