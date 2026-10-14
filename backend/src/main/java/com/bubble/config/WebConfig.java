package com.bubble.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final CorsProperties cors;

    public WebConfig(CorsProperties cors) {
        this.cors = cors;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (!cors.allowedOrigins().isEmpty()) {
            registry.addMapping("/api/v1/**")
                    .allowedOrigins(cors.allowedOrigins().toArray(String[]::new))
                    .allowedMethods("GET", "POST")
                    .allowedHeaders("Accept", "Content-Type", "X-CSRF-TOKEN")
                    .allowCredentials(true)
                    .maxAge(3600);
        }
    }
}
