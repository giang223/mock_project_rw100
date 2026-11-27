package com.minisocial.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;

import java.util.List;
import java.net.URI;
import java.util.regex.Pattern;

@Configuration
@Profile("oauth")
@EnableConfigurationProperties(OAuthClientProperties.class)
public class OAuthClientConfiguration {

    private static final Pattern GRAPH_VERSION = Pattern.compile("v[0-9]+\\.0");

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(
            OAuthClientProperties properties, Environment environment) {
        return clientRegistrationRepository(properties, environment.acceptsProfiles(Profiles.of("prod")));
    }

    ClientRegistrationRepository clientRegistrationRepository(OAuthClientProperties properties) {
        return clientRegistrationRepository(properties, false);
    }

    ClientRegistrationRepository clientRegistrationRepository(OAuthClientProperties properties, boolean production) {
        requireCredentials("Google", properties.getGoogle());
        requireCredentials("Facebook", properties.getFacebook());

        String graphVersion = properties.getFacebook().getGraphVersion();
        if (graphVersion == null || !GRAPH_VERSION.matcher(graphVersion).matches()) {
            throw new IllegalStateException("FACEBOOK_GRAPH_VERSION must use the form vNN.0");
        }
        String redirectUri = redirectUri(properties.getRedirectBaseUrl(), production);

        return new InMemoryClientRegistrationRepository(List.of(
                google(properties.getGoogle(), redirectUri),
                facebook(properties.getFacebook(), graphVersion, redirectUri)
        ));
    }

    private ClientRegistration google(OAuthClientProperties.Provider provider, String redirectUri) {
        return ClientRegistration.withRegistrationId("google")
                .clientId(provider.getClientId())
                .clientSecret(provider.getClientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .issuerUri("https://accounts.google.com")
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .clientName("Google")
                .build();
    }

    private ClientRegistration facebook(OAuthClientProperties.Provider provider, String graphVersion,
                                       String redirectUri) {
        String baseUrl = "https://graph.facebook.com/" + graphVersion;
        return ClientRegistration.withRegistrationId("facebook")
                .clientId(provider.getClientId())
                .clientSecret(provider.getClientSecret())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(redirectUri)
                .scope("email", "public_profile")
                .authorizationUri("https://www.facebook.com/" + graphVersion + "/dialog/oauth")
                .tokenUri(baseUrl + "/oauth/access_token")
                .userInfoUri(baseUrl + "/me?fields=id,name,email,picture")
                .userNameAttributeName("id")
                .clientName("Facebook")
                .build();
    }

    private void requireCredentials(String provider, OAuthClientProperties.Provider credentials) {
        if (credentials == null || credentials.getClientId() == null || credentials.getClientId().isBlank()
                || credentials.getClientSecret() == null || credentials.getClientSecret().isBlank()) {
            throw new IllegalStateException(provider + " OAuth client ID and secret are required when the oauth profile is active");
        }
    }

    private String redirectUri(String configuredBaseUrl, boolean production) {
        if (configuredBaseUrl == null || configuredBaseUrl.isBlank()) {
            throw new IllegalStateException("OAUTH_REDIRECT_BASE_URL is required when OAuth is enabled");
        }
        String baseUrl = configuredBaseUrl.trim().replaceAll("/+$", "");
        URI uri;
        try {
            uri = URI.create(baseUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("OAUTH_REDIRECT_BASE_URL is invalid", exception);
        }
        if (uri.getHost() == null || (uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath()))
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalStateException("OAUTH_REDIRECT_BASE_URL must be an absolute HTTP(S) URL without query or fragment");
        }
        if (production && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalStateException("OAUTH_REDIRECT_BASE_URL must use HTTPS when the prod profile is active");
        }
        return baseUrl + "/login/oauth2/code/{registrationId}";
    }
}
