package com.minisocial.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class AllowedOriginPolicy {

    private final List<String> origins;

    public AllowedOriginPolicy(
            @Value("${app.cors.allowed-origins:${app.frontend-url}}") String configuredOrigins) {
        this.origins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .distinct()
                .toList();
        if (origins.isEmpty() || origins.contains("*")) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS must contain exact origins when credentials are enabled");
        }
    }

    public List<String> getOrigins() {
        return origins;
    }

    public boolean allows(String origin) {
        return origin == null || origins.contains(origin);
    }
}
