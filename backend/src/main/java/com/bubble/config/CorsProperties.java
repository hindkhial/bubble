package com.bubble.config;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("bubble.cors")
public record CorsProperties(
        @NotNull List<@Pattern(regexp = "https?://[^/*?#@\\s]+", message = "Use explicit HTTP(S) origins without paths or wildcards") String> allowedOrigins) {}
