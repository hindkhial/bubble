package com.bubble;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BubbleApplication {
    public static void main(String[] args) {
        SpringApplication.run(BubbleApplication.class, args);
    }
}
