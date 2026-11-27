package com.minisocial.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.minisocial.dto.request.LoginRequest;
import com.minisocial.dto.response.AuthResponse;
import com.minisocial.exception.AppException;
import com.minisocial.security.AllowedOriginPolicy;
import com.minisocial.security.AuthCookieService;
import com.minisocial.service.AuthSession;
import com.minisocial.service.AuthService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private static final String TRUSTED_ORIGIN = "http://localhost:5173";

    @Mock private AuthService authService;

    private AuthController authController;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        AuthCookieService cookieService = new AuthCookieService(
                "MINISOCIAL_REFRESH", "/api/auth", true, "Lax", 604_800_000L);
        authController = new AuthController(
                authService, cookieService, new AllowedOriginPolicy(TRUSTED_ORIGIN));
        objectMapper = new ObjectMapper();
    }

    @Test
    void loginSetsRefreshCookieAndKeepsRefreshTokenOutOfJson() throws JsonProcessingException {
        String refreshToken = "server-only-refresh-token";
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("person@example.com");
        loginRequest.setPassword("valid-password");
        when(authService.login(any(LoginRequest.class))).thenReturn(
                new AuthSession(AuthResponse.of("access-token", null), refreshToken));

        ResponseEntity<?> response = authController.login(loginRequest, request(TRUSTED_ORIGIN));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        String setCookie = response.getHeaders().getFirst("Set-Cookie");
        assertTrue(setCookie.contains("MINISOCIAL_REFRESH=" + refreshToken));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("Secure"));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        String json = objectMapper.writeValueAsString(response.getBody());
        assertTrue(json.contains("access-token"));
        assertFalse(json.contains(refreshToken));
        assertFalse(json.contains("refreshToken"));
    }

    @Test
    void loginRejectsUntrustedOriginBeforeAuthenticating() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("person@example.com");
        loginRequest.setPassword("valid-password");

        AppException exception = assertThrows(AppException.class,
                () -> authController.login(loginRequest, request("https://untrusted.example")));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        verify(authService, never()).login(any(LoginRequest.class));
    }

    @Test
    void invalidRefreshClearsCookieAndReturnsUnauthorized() {
        MockHttpServletRequest request = request(TRUSTED_ORIGIN);
        request.setCookies(new Cookie("MINISOCIAL_REFRESH", "invalid-refresh-token"));
        when(authService.refreshToken("invalid-refresh-token"))
                .thenThrow(new AppException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));

        ResponseEntity<?> response = authController.refresh(request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        String setCookie = response.getHeaders().getFirst("Set-Cookie");
        assertTrue(setCookie.contains("MINISOCIAL_REFRESH=;"));
        assertTrue(setCookie.contains("Max-Age=0"));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("HttpOnly"));
    }

    @Test
    void logoutRevokesCookieSessionAndExpiresRefreshCookie() {
        MockHttpServletRequest request = request(TRUSTED_ORIGIN);
        request.setCookies(new Cookie("MINISOCIAL_REFRESH", "current-refresh-token"));

        ResponseEntity<?> response = authController.logout(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(authService).logout("current-refresh-token");
        String setCookie = response.getHeaders().getFirst("Set-Cookie");
        assertTrue(setCookie.contains("MINISOCIAL_REFRESH=;"));
        assertTrue(setCookie.contains("Max-Age=0"));
    }

    private MockHttpServletRequest request(String origin) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Origin", origin);
        return request;
    }
}
