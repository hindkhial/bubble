package com.bubble.config;

import java.util.Arrays;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

/** Fail closed when a deployed profile accidentally inherits local settings. */
@Configuration
@Profile({"staging", "prod"})
public class DeploymentSafety {
    @Bean Object deploymentSafetyCheck(Environment environment, CorsProperties cors) {
        validate(environment, cors);
        return new Object();
    }

    public static void validate(Environment env, CorsProperties cors) {
        if (Arrays.asList(env.getActiveProfiles()).contains("local"))
            throw new IllegalStateException("Deployed profiles cannot enable local settings.");
        if (cors.allowedOrigins().isEmpty() || cors.allowedOrigins().stream().anyMatch(origin -> !origin.startsWith("https://")))
            throw new IllegalStateException("Deployed profiles require explicit HTTPS CORS origins.");
        require(env, "server.servlet.session.cookie.secure", "true");
        require(env, "server.servlet.session.cookie.http-only", "true");
        require(env, "server.servlet.session.cookie.same-site", "lax");
        require(env, "spring.jpa.hibernate.ddl-auto", "validate");
        require(env, "spring.flyway.enabled", "true");
        require(env, "spring.flyway.clean-disabled", "true");
        require(env, "spring.flyway.validate-on-migrate", "true");
        require(env, "spring.jpa.show-sql", "false");
        require(env, "server.error.include-message", "never");
        require(env, "server.error.include-stacktrace", "never");
    }

    private static void require(Environment env, String key, String expected) {
        if (!expected.equalsIgnoreCase(env.getProperty(key)))
            throw new IllegalStateException("Unsafe deployed setting: " + key);
    }
}
