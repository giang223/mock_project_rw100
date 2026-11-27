package com.minisocial.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.auth.oauth")
public class OAuthClientProperties {

    private boolean enabled;
    private String callbackUrl;
    private String redirectBaseUrl;
    private Provider google = new Provider();
    private Provider facebook = new Provider();

    @Getter
    @Setter
    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String graphVersion;
    }
}
