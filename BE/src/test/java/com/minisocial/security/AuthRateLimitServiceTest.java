package com.minisocial.security;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthRateLimitServiceTest {

    @Test
    void enforcesLimitPerKeyAndKeepsIndependentKeysSeparate() {
        AuthRateLimitService service = new AuthRateLimitService();
        Duration window = Duration.ofMinutes(1);

        assertTrue(service.acquire("login:ip-a", 2, window).allowed());
        assertTrue(service.acquire("login:ip-a", 2, window).allowed());
        AuthRateLimitService.Decision rejected = service.acquire("login:ip-a", 2, window);
        assertFalse(rejected.allowed());
        assertTrue(rejected.retryAfterSeconds() > 0);
        assertTrue(service.acquire("login:ip-b", 2, window).allowed());
    }
}
