package com.bubble.config;

import java.io.IOException;
import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.cors.*;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class WebConfig {
    @Bean CorsFilter corsFilter(CorsProperties properties) {
        var policy = new CorsConfiguration();
        policy.setAllowedOrigins(properties.allowedOrigins());
        policy.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "PUT"));
        policy.setAllowedHeaders(List.of("Accept", "Content-Type", "X-CSRF-TOKEN"));
        policy.setAllowCredentials(true);
        policy.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/v1/**", policy);
        var filter = new CorsFilter(source);
        filter.setCorsProcessor(new DefaultCorsProcessor() {
            @Override protected void rejectRequest(org.springframework.http.server.ServerHttpResponse response) throws IOException {
                response.setStatusCode(org.springframework.http.HttpStatus.FORBIDDEN);
                response.getHeaders().setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                response.getBody().write("{\"status\":403,\"message\":\"Request not permitted.\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                response.flush();
            }
        });
        return filter;
    }
    // Spring Security owns the CORS filter; do not register it twice as a Servlet filter.
    @Bean FilterRegistrationBean<CorsFilter> corsRegistration(CorsFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
