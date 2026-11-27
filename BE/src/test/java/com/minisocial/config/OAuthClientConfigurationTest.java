package com.minisocial.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OAuthClientConfigurationTest {

    @Test
    void registersGoogleOidcAndFacebookAuthorizationCodeClients() {
        OAuthClientProperties properties = configuredProperties();
        ClientRegistrationRepository repository = new OAuthClientConfiguration()
                .clientRegistrationRepository(properties);

        ClientRegistration google = repository.findByRegistrationId("google");
        ClientRegistration facebook = repository.findByRegistrationId("facebook");

        assertEquals("google", google.getRegistrationId());
        assertEquals("openid", google.getScopes().stream().filter("openid"::equals).findFirst().orElseThrow());
        assertEquals("http://localhost:8080/login/oauth2/code/{registrationId}", google.getRedirectUri());
        assertEquals("https://www.facebook.com/v27.0/dialog/oauth", facebook.getProviderDetails().getAuthorizationUri());
        assertEquals("https://graph.facebook.com/v27.0/oauth/access_token", facebook.getProviderDetails().getTokenUri());
        assertEquals("id", facebook.getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName());
    }

    @Test
    void rejectsMalformedFacebookGraphVersion() {
        OAuthClientProperties properties = configuredProperties();
        properties.getFacebook().setGraphVersion("latest");

        assertThrows(IllegalStateException.class,
                () -> new OAuthClientConfiguration().clientRegistrationRepository(properties));
    }

    @Test
    void productionRequiresHttpsProviderRedirectBase() {
        OAuthClientProperties properties = configuredProperties();

        assertThrows(IllegalStateException.class,
                () -> new OAuthClientConfiguration().clientRegistrationRepository(properties, true));

        properties.setRedirectBaseUrl("https://api.example.com");
        new OAuthClientConfiguration().clientRegistrationRepository(properties, true);
    }

    private OAuthClientProperties configuredProperties() {
        OAuthClientProperties properties = new OAuthClientProperties();
        properties.getGoogle().setClientId("google-client-id");
        properties.getGoogle().setClientSecret("google-client-secret");
        properties.getFacebook().setClientId("facebook-client-id");
        properties.getFacebook().setClientSecret("facebook-client-secret");
        properties.getFacebook().setGraphVersion("v27.0");
        properties.setRedirectBaseUrl("http://localhost:8080");
        return properties;
    }
}
