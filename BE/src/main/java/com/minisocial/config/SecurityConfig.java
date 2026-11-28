package com.minisocial.config;

import com.minisocial.security.JwtAuthenticationFilter;
import com.minisocial.security.AuthRateLimitFilter;
import com.minisocial.security.AuthRateLimitService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.minisocial.security.OAuthLoginHandlers;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.CorsFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.config.Customizer;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final ObjectProvider<OAuthLoginHandlers> oauthLoginHandlers;

    @org.springframework.beans.factory.annotation.Value("${app.auth.oauth.enabled:false}")
    private boolean oauthEnabled;

    @Bean
    public AuthRateLimitFilter authRateLimitFilter(AuthRateLimitService rateLimitService,
                                                  ObjectMapper objectMapper) {
        return new AuthRateLimitFilter(rateLimitService, objectMapper);
    }

    @Bean
    public FilterRegistrationBean<AuthRateLimitFilter> authRateLimitFilterRegistration(
            AuthRateLimitFilter authRateLimitFilter) {
        FilterRegistrationBean<AuthRateLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(authRateLimitFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthRateLimitFilter authRateLimitFilter,
                                                   AuthenticationProvider authenticationProvider) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session ->
                session.sessionCreationPolicy(oauthEnabled
                        ? SessionCreationPolicy.IF_REQUIRED : SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setCharacterEncoding("UTF-8");
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Vui lòng đăng nhập để tiếp tục\"}");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setCharacterEncoding("UTF-8");
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Bạn không có quyền thực hiện hành động này\"}");
                }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/actuator/health/**").permitAll()
                .requestMatchers("/oauth2/authorization/**", "/login/oauth2/code/**").permitAll()
                // The HTTP handshake has no browser-accessible custom Authorization header.
                // JWT authentication and destination authorization happen on STOMP frames.
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers(HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/refresh",
                    "/api/auth/logout",
                    "/api/auth/verify-email",
                    "/api/auth/verify-email/resend",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider)
            .addFilterAfter(authRateLimitFilter, CorsFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        if (oauthEnabled) {
            OAuthLoginHandlers handlers = oauthLoginHandlers.getObject();
            http.securityContext(context -> context
                            .securityContextRepository(new org.springframework.security.web.context.NullSecurityContextRepository()))
                    .oauth2Login(oauth -> oauth
                            .successHandler(handlers)
                            .failureHandler(handlers)
                            .authorizedClientRepository(new DiscardingAuthorizedClientRepository()));
        }

        return http.build();
    }

    private static final class DiscardingAuthorizedClientRepository
            implements OAuth2AuthorizedClientRepository {
        @Override
        public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
                String clientRegistrationId, Authentication principal, HttpServletRequest request) {
            return null;
        }

        @Override
        public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient, Authentication principal,
                                         HttpServletRequest request, HttpServletResponse response) {
            // Provider access tokens are needed only while reading the profile during the callback.
        }

        @Override
        public void removeAuthorizedClient(String clientRegistrationId, Authentication principal,
                                           HttpServletRequest request, HttpServletResponse response) {
            // No provider credential is retained by this application.
        }
    }
}
