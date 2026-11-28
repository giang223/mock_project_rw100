package com.minisocial.security;

import com.minisocial.entity.OAuthIdentity;
import com.minisocial.exception.AppException;
import com.minisocial.service.AuthService;
import com.minisocial.service.ExternalOAuthProfile;
import com.minisocial.service.OAuthIdentityService;
import com.minisocial.service.AuthSession;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "app.auth.oauth", name = "enabled", havingValue = "true")
@Slf4j
public class OAuthLoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private final OAuthIdentityService oauthIdentityService;
    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final AllowedOriginPolicy allowedOriginPolicy;
    private final String callbackUrl;
    private final Environment environment;

    public OAuthLoginHandlers(
            OAuthIdentityService oauthIdentityService,
            AuthService authService,
            AuthCookieService authCookieService,
            AllowedOriginPolicy allowedOriginPolicy,
            @Value("${app.auth.oauth.callback-url:${app.frontend-url}/oauth/callback}") String callbackUrl,
            Environment environment) {
        this.oauthIdentityService = oauthIdentityService;
        this.authService = authService;
        this.authCookieService = authCookieService;
        this.allowedOriginPolicy = allowedOriginPolicy;
        this.callbackUrl = callbackUrl;
        this.environment = environment;
    }

    @PostConstruct
    void validateCallbackUrl() {
        URI callback;
        try {
            callback = URI.create(callbackUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("OAuth callback URL is invalid", exception);
        }
        if (callback.getHost() == null || callback.getUserInfo() != null
                || callback.getQuery() != null || callback.getFragment() != null
                || !("http".equalsIgnoreCase(callback.getScheme())
                    || "https".equalsIgnoreCase(callback.getScheme()))) {
            throw new IllegalStateException("OAuth callback URL must be an absolute HTTP(S) URL without query or fragment");
        }
        if (environment.acceptsProfiles(Profiles.of("prod")) && !"https".equalsIgnoreCase(callback.getScheme())) {
            throw new IllegalStateException("OAuth callback URL must use HTTPS when the prod profile is active");
        }
        String origin = callback.getScheme() + "://" + callback.getRawAuthority();
        if (!allowedOriginPolicy.getOrigins().contains(origin)) {
            throw new IllegalStateException("OAuth callback URL origin must be listed in CORS_ALLOWED_ORIGINS");
        }
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
                throw new AppException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "Đăng nhập OAuth không hợp lệ");
            }
            ExternalOAuthProfile profile = mapProfile(oauthToken);
            var user = oauthIdentityService.resolveOrCreate(profile);
            if (!Boolean.TRUE.equals(user.getIsEmailVerified())) {
                authService.resendVerification(user.getEmail());
                invalidateTransientSession(request);
                redirect(response, "#login=verification_required");
                return;
            }
            AuthSession session = authService.createOAuthSession(user.getId());

            response.addHeader(HttpHeaders.SET_COOKIE,
                    authCookieService.createRefreshCookie(session.getRefreshToken()).toString());
            invalidateTransientSession(request);
            redirect(response, "#login=success");
        } catch (RuntimeException exception) {
            log.warn("OAuth sign-in was rejected: {}", exception.getClass().getSimpleName());
            invalidateTransientSession(request);
            redirect(response, "#error=oauth_failed");
        }
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                       org.springframework.security.core.AuthenticationException exception)
            throws IOException {
        log.warn("OAuth provider authentication failed: {}", exception.getClass().getSimpleName());
        invalidateTransientSession(request);
        redirect(response, "#error=oauth_failed");
    }

    private ExternalOAuthProfile mapProfile(OAuth2AuthenticationToken authentication) {
        String registrationId = authentication.getAuthorizedClientRegistrationId().toLowerCase(Locale.ROOT);
        OAuthIdentity.Provider provider = switch (registrationId) {
            case "google" -> OAuthIdentity.Provider.GOOGLE;
            case "facebook" -> OAuthIdentity.Provider.FACEBOOK;
            default -> throw new AppException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Nhà cung cấp OAuth không được hỗ trợ");
        };

        Map<String, Object> attributes = authentication.getPrincipal().getAttributes();
        String subject = value(attributes.get(provider == OAuthIdentity.Provider.GOOGLE ? "sub" : "id"));
        String email = value(attributes.get("email"));
        // Meta's user email field does not include Google's explicit email_verified claim.
        // The application verifies a first-time Facebook email before issuing a session.
        boolean verified = provider == OAuthIdentity.Provider.GOOGLE
                && Boolean.TRUE.equals(attributes.get("email_verified"));
        String fullName = value(attributes.get("name"));
        String avatarUrl = value(attributes.get("picture"));
        if (avatarUrl == null && attributes.get("picture") instanceof Map<?, ?> picture) {
            Object data = picture.get("data");
            if (data instanceof Map<?, ?> pictureData) {
                avatarUrl = value(pictureData.get("url"));
            }
        }
        return new ExternalOAuthProfile(provider, subject, email, verified, fullName, avatarUrl);
    }

    private String value(Object value) {
        return value instanceof String string && !string.isBlank() ? string : null;
    }

    private void invalidateTransientSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    private void redirect(HttpServletResponse response, String fragment) throws IOException {
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader(HttpHeaders.LOCATION, callbackUrl + fragment);
    }
}
