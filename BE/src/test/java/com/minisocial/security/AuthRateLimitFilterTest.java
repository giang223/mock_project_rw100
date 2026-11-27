package com.minisocial.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRateLimitFilterTest {

    @Test
    void loginLimitReturns429AndRetryAfterWithoutCallingApplicationChain() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(
                new AuthRateLimitService(), new ObjectMapper());
        AtomicInteger chainCalls = new AtomicInteger();
        FilterChain chain = (request, response) -> chainCalls.incrementAndGet();
        MockHttpServletResponse lastResponse = null;

        for (int attempt = 0; attempt < 31; attempt++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setMethod("POST");
            request.setServletPath("/api/auth/login");
            request.setRemoteAddr("192.0.2.10");
            lastResponse = new MockHttpServletResponse();
            filter.doFilter(request, lastResponse, chain);
        }

        assertEquals(30, chainCalls.get());
        assertEquals(429, lastResponse.getStatus());
        assertEquals("900", lastResponse.getHeader("Retry-After"));
    }
}
