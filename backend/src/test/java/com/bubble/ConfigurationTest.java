package com.bubble;

import com.bubble.config.CorsProperties;
import com.bubble.config.HttpProperties;
import jakarta.validation.Validation;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ConfigurationTest {
    @Test
    void originsAndAuthenticationBudgetsAreValidated() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String origin : List.of("https://example.com:70000", "http://localhost:0", "https://example.com:bad", "https://:443"))
                assertFalse(validator.validate(new CorsProperties(List.of(origin))).isEmpty());
            assertFalse(validator.validate(new com.bubble.config.AuthLimitsProperties(0, 10)).isEmpty());
            assertFalse(validator.validate(new com.bubble.config.AuthLimitsProperties(10, 100001)).isEmpty());
            assertTrue(validator.validate(new com.bubble.config.AuthLimitsProperties(60, 300)).isEmpty());
        }
    }
    @Test
    void configurationRejectsWildcardsAndInvalidLimits() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new CorsProperties(List.of("http://localhost:8081"))).isEmpty());
            assertTrue(validator.validate(new CorsProperties(List.of())).isEmpty());
            assertFalse(validator.validate(new CorsProperties(List.of("*"))).isEmpty());
            assertFalse(validator.validate(new CorsProperties(List.of("https://*.example.com"))).isEmpty());
            assertFalse(validator.validate(new CorsProperties(List.of("https://example.com/path"))).isEmpty());
            assertFalse(validator.validate(new HttpProperties(0)).isEmpty());
            assertFalse(validator.validate(new HttpProperties(10485761)).isEmpty());
        }
    }
}
