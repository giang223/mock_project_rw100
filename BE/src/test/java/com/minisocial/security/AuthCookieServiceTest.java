package com.minisocial.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthCookieServiceTest {

    private static final long REFRESH_TOKEN_TTL_MILLIS = 604_800_000L;

    @Test
    void createRefreshCookieUsesHttpOnlySecureAndConfiguredScope() {
        AuthCookieService cookieService = cookieService(true, "Lax");

        ResponseCookie cookie = cookieService.createRefreshCookie("refresh-secret");

        assertEquals("MINISOCIAL_REFRESH", cookie.getName());
        assertEquals("refresh-secret", cookie.getValue());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("/api/auth", cookie.getPath());
        assertEquals("Lax", cookie.getSameSite());
        assertEquals(Duration.ofMillis(REFRESH_TOKEN_TTL_MILLIS), cookie.getMaxAge());
        assertFalse(cookie.toString().contains("Domain="));
    }

    @Test
    void clearRefreshCookieExpiresAtTheSamePathAndRetainsSecurityAttributes() {
        ResponseCookie cookie = cookieService(true, "Strict").clearRefreshCookie();

        assertEquals("", cookie.getValue());
        assertEquals(Duration.ZERO, cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("/api/auth", cookie.getPath());
        assertEquals("Strict", cookie.getSameSite());
    }

    @Test
    void readRefreshTokenReturnsOnlyTheConfiguredCookie() {
        AuthCookieService cookieService = cookieService(false, "Lax");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("other", "ignored"),
                new Cookie("MINISOCIAL_REFRESH", "stored-refresh-token"));

        assertEquals("stored-refresh-token", cookieService.readRefreshToken(request));

        request.setCookies(new Cookie("other", "ignored"));
        assertNull(cookieService.readRefreshToken(request));
    }

    @Test
    void sameSiteNoneRequiresSecureCookie() {
        AuthCookieService cookieService = new AuthCookieService(
                "MINISOCIAL_REFRESH", "/api/auth", false, "None", REFRESH_TOKEN_TTL_MILLIS);

        assertThrows(IllegalStateException.class, cookieService::validateConfiguration);
    }

    private AuthCookieService cookieService(boolean secure, String sameSite) {
        AuthCookieService cookieService = new AuthCookieService(
                "MINISOCIAL_REFRESH", "/api/auth", secure, sameSite, REFRESH_TOKEN_TTL_MILLIS);
        cookieService.validateConfiguration();
        return cookieService;
    }
}
