package com.bubble;

import com.bubble.config.CorsProperties;
import com.bubble.config.HttpProperties;
import jakarta.validation.Validation;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ConfigurationTest {
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
