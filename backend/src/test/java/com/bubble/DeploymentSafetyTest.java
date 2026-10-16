package com.bubble;

import com.bubble.config.CorsProperties;
import com.bubble.config.DeploymentSafety;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.*;
import static org.junit.jupiter.api.Assertions.*;

class DeploymentSafetyTest {
    private StandardEnvironment environment() {
        var env = new StandardEnvironment();
        env.setActiveProfiles("staging");
        var settings = new HashMap<String,Object>();
        for (var key : List.of("server.servlet.session.cookie.secure", "server.servlet.session.cookie.http-only",
                "spring.flyway.enabled", "spring.flyway.clean-disabled", "spring.flyway.validate-on-migrate")) settings.put(key,"true");
        settings.put("server.servlet.session.cookie.same-site","lax");
        settings.put("spring.jpa.hibernate.ddl-auto","validate");
        settings.put("spring.jpa.show-sql","false");
        settings.put("server.error.include-message","never");
        settings.put("server.error.include-stacktrace","never");
        env.getPropertySources().addFirst(new MapPropertySource("safe",settings));
        return env;
    }
    private final CorsProperties cors = new CorsProperties(List.of("https://localhost:8443"));
    @Test void rejectsInsecureOriginsAndMixedLocalProfile() {
        assertDoesNotThrow(()->DeploymentSafety.validate(environment(),cors));
        assertThrows(IllegalStateException.class,()->DeploymentSafety.validate(environment(),new CorsProperties(List.of())));
        assertThrows(IllegalStateException.class,()->DeploymentSafety.validate(environment(),new CorsProperties(List.of("http://localhost"))));
        var env=environment();env.setActiveProfiles("staging","local");
        assertThrows(IllegalStateException.class,()->DeploymentSafety.validate(env,cors));
    }
    @Test void rejectsUnsafeCookieSchemaAndErrorOverrides() {
        for (var entry:Map.of("server.servlet.session.cookie.secure","false", "spring.jpa.hibernate.ddl-auto","create",
                "spring.flyway.clean-disabled","false", "spring.jpa.show-sql","true", "server.error.include-stacktrace","always").entrySet()) {
            var env=environment();env.getPropertySources().addFirst(new MapPropertySource("unsafe",Map.of(entry.getKey(),entry.getValue())));
            assertThrows(IllegalStateException.class,()->DeploymentSafety.validate(env,cors),entry.getKey());
        }
    }
}
