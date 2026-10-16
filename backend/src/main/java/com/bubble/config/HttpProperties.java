package com.bubble.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("bubble.http")
public record HttpProperties(@Min(1) @Max(10485760) int maxRequestBytes) {}
