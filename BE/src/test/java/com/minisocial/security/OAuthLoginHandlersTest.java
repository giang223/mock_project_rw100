package com.minisocial.security;

import com.minisocial.entity.OAuthIdentity;
import com.minisocial.entity.User;
import com.minisocial.dto.response.AuthResponse;
import com.minisocial.service.AuthService;
import com.minisocial.service.AuthSession;
import com.minisocial.service.ExternalOAuthProfile;
import com.minisocial.service.OAuthIdentityService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuthLoginHandlersTest {

    @Mock private OAuthIdentityService oauthIdentityService;
    @Mock private AuthService authService;
    @Mock private AuthCookieService authCookieService;
    @Mock private AllowedOriginPolicy allowedOriginPolicy;

    @Test
    void redirectsWithoutTokensAndSetsRefreshCookieForGoogleLogin() throws Exception {
        when(allowedOriginPolicy.getOrigins()).thenReturn(List.of("http://localhost:5173"));
        OAuthLoginHandlers handlers = new OAuthLoginHandlers(oauthIdentityService, authService,
                authCookieService, allowedOriginPolicy, "http://localhost:5173/oauth/callback",
                new StandardEnvironment());
        handlers.validateCallbackUrl();
        User user = User.builder().id(42L).isEmailVerified(true).isActive(true).build();
        when(oauthIdentityService.resolveOrCreate(any(ExternalOAuthProfile.class))).thenReturn(user);
        when(authService.createOAuthSession(42L))
                .thenReturn(new AuthSession(AuthResponse.of("access-secret", null), "refresh-secret"));
        when(authCookieService.createRefreshCookie("refresh-secret"))
                .thenReturn(ResponseCookie.from("MINISOCIAL_REFRESH", "refresh-secret")
                        .httpOnly(true).path("/api/auth").build());

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        MockHttpServletResponse response = new MockHttpServletResponse();
        handlers.onAuthenticationSuccess(request, response, googleAuthentication());

        assertEquals(302, response.getStatus());
        assertEquals("http://localhost:5173/oauth/callback#login=success", response.getHeader("Location"));
        org.junit.jupiter.api.Assertions.assertFalse(response.getHeader("Location").contains("access-secret"));
        assertEquals("no-store", response.getHeader("Cache-Control"));
        assertEquals("no-referrer", response.getHeader("Referrer-Policy"));
        assertEquals("MINISOCIAL_REFRESH=refresh-secret; Path=/api/auth; HttpOnly",
                response.getHeader("Set-Cookie"));
        assertNull(request.getSession(false));
        ArgumentCaptor<ExternalOAuthProfile> profile = ArgumentCaptor.forClass(ExternalOAuthProfile.class);
        verify(oauthIdentityService).resolveOrCreate(profile.capture());
        assertEquals(OAuthIdentity.Provider.GOOGLE, profile.getValue().provider());
        assertEquals("google-subject", profile.getValue().subject());
        assertEquals("person@example.com", profile.getValue().email());
        verify(authCookieService).createRefreshCookie("refresh-secret");
    }

    @Test
    void sendsGenericFailureRedirectAndClearsTransientSession() throws Exception {
        OAuthLoginHandlers handlers = new OAuthLoginHandlers(oauthIdentityService, authService,
                authCookieService, allowedOriginPolicy, "http://localhost:5173/oauth/callback",
                new StandardEnvironment());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        MockHttpServletResponse response = new MockHttpServletResponse();

        handlers.onAuthenticationFailure(request, response, new BadCredentialsException("provider detail"));

        assertEquals(302, response.getStatus());
        assertEquals("http://localhost:5173/oauth/callback#error=oauth_failed", response.getHeader("Location"));
        assertNull(request.getSession(false));
    }

    @Test
    void requiresApplicationEmailVerificationForFacebookBeforeIssuingCookie() throws Exception {
        OAuthLoginHandlers handlers = new OAuthLoginHandlers(oauthIdentityService, authService,
                authCookieService, allowedOriginPolicy, "http://localhost:5173/oauth/callback",
                new StandardEnvironment());
        User user = User.builder().id(42L).email("person@example.com").isEmailVerified(false).build();
        when(oauthIdentityService.resolveOrCreate(any(ExternalOAuthProfile.class))).thenReturn(user);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        MockHttpServletResponse response = new MockHttpServletResponse();

        handlers.onAuthenticationSuccess(request, response, facebookAuthentication());

        assertEquals(302, response.getStatus());
        assertEquals("http://localhost:5173/oauth/callback#login=verification_required",
                response.getHeader("Location"));
        org.junit.jupiter.api.Assertions.assertNull(response.getHeader("Set-Cookie"));
        assertNull(request.getSession(false));
        verify(authService).resendVerification("person@example.com");
        ArgumentCaptor<ExternalOAuthProfile> profile = ArgumentCaptor.forClass(ExternalOAuthProfile.class);
        verify(oauthIdentityService).resolveOrCreate(profile.capture());
        assertEquals(OAuthIdentity.Provider.FACEBOOK, profile.getValue().provider());
        org.junit.jupiter.api.Assertions.assertFalse(profile.getValue().emailVerified());
    }

    @Test
    void rejectsCallbackUrlOutsideTheConfiguredOriginAllowlist() {
        when(allowedOriginPolicy.getOrigins()).thenReturn(List.of("http://localhost:5173"));
        OAuthLoginHandlers handlers = new OAuthLoginHandlers(oauthIdentityService, authService,
                authCookieService, allowedOriginPolicy, "https://attacker.example/oauth/callback",
                new StandardEnvironment());

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, handlers::validateCallbackUrl);
    }

    @Test
    void productionRejectsInsecureFrontendCallbackUrl() {
        StandardEnvironment production = new StandardEnvironment();
        production.setActiveProfiles("prod");
        OAuthLoginHandlers handlers = new OAuthLoginHandlers(oauthIdentityService, authService,
                authCookieService, allowedOriginPolicy, "http://localhost:5173/oauth/callback", production);

        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, handlers::validateCallbackUrl);
    }

    private OAuth2AuthenticationToken googleAuthentication() {
        Map<String, Object> attributes = Map.of(
                "sub", "google-subject",
                "email", "person@example.com",
                "email_verified", true,
                "name", "Person Example",
                "picture", "https://cdn.example.com/avatar.png");
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, "sub");
        return new OAuth2AuthenticationToken(principal,
                List.of(new SimpleGrantedAuthority("ROLE_USER")), "google");
    }

    private OAuth2AuthenticationToken facebookAuthentication() {
        Map<String, Object> attributes = Map.of(
                "id", "facebook-subject",
                "email", "person@example.com",
                "name", "Person Example");
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, "id");
        return new OAuth2AuthenticationToken(principal,
                List.of(new SimpleGrantedAuthority("ROLE_USER")), "facebook");
    }
}
