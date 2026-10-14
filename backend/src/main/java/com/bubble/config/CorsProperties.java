package com.bubble.config;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("bubble.cors")
public record CorsProperties(
        @NotNull List<@Pattern(regexp = "https?://[^/*?#@\\s]+", message = "Use explicit HTTP(S) origins without paths or wildcards") String> allowedOrigins) {
    @AssertTrue(message = "Use valid HTTP(S) origins with a host and valid port")
    public boolean isOriginsValid() {
        if (allowedOrigins == null) return true;
        return allowedOrigins.stream().allMatch(value -> {
            try {
                var uri = java.net.URI.create(value);
                return ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                        && uri.getHost() != null && !uri.getHost().isBlank()
                        && (uri.getPort() == -1 || (uri.getPort() > 0 && uri.getPort() <= 65535))
                        && uri.getRawUserInfo() == null && uri.getRawQuery() == null && uri.getRawFragment() == null
                        && (uri.getRawPath() == null || uri.getRawPath().isEmpty());
            } catch (RuntimeException invalid) { return false; }
        });
    }
}
