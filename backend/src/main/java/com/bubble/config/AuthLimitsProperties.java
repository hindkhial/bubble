package com.bubble.config;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("bubble.auth-limits")
public record AuthLimitsProperties(@Min(1) @Max(10000) int perAddressPerMinute,
        @Min(1) @Max(100000) int totalPerMinute) {}
