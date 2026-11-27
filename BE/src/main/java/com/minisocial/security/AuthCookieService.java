package com.minisocial.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Component
public class AuthCookieService {

    private static final Set<String> SUPPORTED_SAME_SITE_VALUES = Set.of("lax", "strict", "none");

    private final String cookieName;
    private final String cookiePath;
    private final boolean secure;
    private final String sameSite;
    private final long maxAgeMillis;

    public AuthCookieService(
            @Value("${app.auth.refresh-cookie-name}") String cookieName,
            @Value("${app.auth.refresh-cookie-path}") String cookiePath,
            @Value("${app.auth.refresh-cookie-secure}") boolean secure,
            @Value("${app.auth.refresh-cookie-same-site}") String sameSite,
            @Value("${jwt.refresh-token-expiration}") long maxAgeMillis) {
        this.cookieName = cookieName;
        this.cookiePath = cookiePath;
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAgeMillis = maxAgeMillis;
    }

    @PostConstruct
    void validateConfiguration() {
        if (cookieName == null || cookieName.isBlank()) {
            throw new IllegalStateException("app.auth.refresh-cookie-name must not be blank");
        }
        if (cookiePath == null || !cookiePath.startsWith("/")) {
            throw new IllegalStateException("app.auth.refresh-cookie-path must start with '/'");
        }
        if (sameSite == null || !SUPPORTED_SAME_SITE_VALUES.contains(sameSite.toLowerCase(Locale.ROOT))) {
            throw new IllegalStateException("app.auth.refresh-cookie-same-site must be Lax, Strict, or None");
        }
        if ("none".equalsIgnoreCase(sameSite) && !secure) {
            throw new IllegalStateException("SameSite=None requires a Secure refresh cookie");
        }
        if (maxAgeMillis <= 0) {
            throw new IllegalStateException("jwt.refresh-token-expiration must be positive");
        }
    }

    public ResponseCookie createRefreshCookie(String refreshToken) {
        return buildCookie(refreshToken, Duration.ofMillis(maxAgeMillis));
    }

    public ResponseCookie clearRefreshCookie() {
        return buildCookie("", Duration.ZERO);
    }

    public String readRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
                .filter(cookie -> cookieName.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(cookieName, value)
                .httpOnly(true)
                .secure(secure)
                .path(cookiePath)
                .sameSite(sameSite)
                .maxAge(maxAge)
                .build();
    }
}
