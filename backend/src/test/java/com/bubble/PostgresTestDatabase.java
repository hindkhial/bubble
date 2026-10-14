package com.bubble;

import java.util.Map;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Testcontainers by default; an explicit disposable real PostgreSQL can be used without Docker. */
final class PostgresTestDatabase {
    private static PostgreSQLContainer container;
    private static Map<String, Object> settings;

    private PostgresTestDatabase() {}

    static synchronized ConfigurableApplicationContext start(Class<?>... sources) {
        if (settings == null) {
            String url = System.getenv("BUBBLE_TEST_DB_URL");
            String username;
            String password;
            if (url == null || url.isBlank()) {
                container = new PostgreSQLContainer("postgres:17-alpine");
                container.start();
                Runtime.getRuntime().addShutdownHook(new Thread(container::stop));
                url = container.getJdbcUrl();
                username = container.getUsername();
                password = container.getPassword();
            } else {
                if (!url.startsWith("jdbc:postgresql:")) throw new IllegalArgumentException("Tests require PostgreSQL.");
                username = required("BUBBLE_TEST_DB_USERNAME");
                password = required("BUBBLE_TEST_DB_PASSWORD");
            }
            settings = Map.of("spring.datasource.url", url, "spring.datasource.username", username,
                    "spring.datasource.password", password);
        }
        var environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("testDatabase", settings));
        return new SpringApplicationBuilder(sources).environment(environment).profiles("test").run();
    }

    private static String required(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing test database setting: " + key);
        return value;
    }
}
