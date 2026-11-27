package com.minisocial.config;

import com.minisocial.security.AllowedOriginPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CorsConfigTest {

    @Test
    void allowsOnlyConfiguredExactOriginsAndSupportsCredentialedCookies() {
        AllowedOriginPolicy policy = new AllowedOriginPolicy(
                "https://app.example.com, https://admin.example.com,https://app.example.com");
        CorsConfig config = new CorsConfig(policy);

        CorsConfiguration cors = config.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/api/auth/refresh"));

        assertEquals(2, cors.getAllowedOrigins().size());
        assertTrue(cors.getAllowedOrigins().contains("https://app.example.com"));
        assertTrue(cors.getAllowedOrigins().contains("https://admin.example.com"));
        assertTrue(cors.getAllowCredentials());
        assertFalse(cors.getAllowedOrigins().contains("http://localhost:5173"));
        assertTrue(policy.allows(null));
        assertTrue(policy.allows("https://app.example.com"));
        assertFalse(policy.allows("http://localhost:5173"));
    }

    @Test
    void rejectsWildcardWhenCredentialedRequestsAreEnabled() {
        assertThrows(IllegalStateException.class, () -> new AllowedOriginPolicy("*"));
    }
}
