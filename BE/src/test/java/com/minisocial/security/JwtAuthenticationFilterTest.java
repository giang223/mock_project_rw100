package com.minisocial.security;

import com.minisocial.repository.RefreshTokenRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserDetailsServiceImpl userDetailsService;
    @Mock private RefreshTokenRepository refreshTokenRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void revokedServerSessionRejectsOtherwiseValidAccessToken() throws Exception {
        UserDetails userDetails = userDetails();
        when(jwtTokenProvider.validateAccessToken("access-token")).thenReturn(true);
        when(jwtTokenProvider.extractUsername("access-token")).thenReturn("person@example.com");
        when(jwtTokenProvider.extractSessionId("access-token")).thenReturn("session-1");
        when(jwtTokenProvider.isTokenValid("access-token", userDetails)).thenReturn(true);
        when(userDetailsService.loadUserByUsername("person@example.com")).thenReturn(userDetails);
        when(refreshTokenRepository.existsActiveSession(eq("session-1"), eq("person@example.com"),
                any(LocalDateTime.class))).thenReturn(false);

        invokeFilter();

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void activeServerSessionAuthenticatesAccessToken() throws Exception {
        UserDetails userDetails = userDetails();
        when(jwtTokenProvider.validateAccessToken("access-token")).thenReturn(true);
        when(jwtTokenProvider.extractUsername("access-token")).thenReturn("person@example.com");
        when(jwtTokenProvider.extractSessionId("access-token")).thenReturn("session-1");
        when(jwtTokenProvider.isTokenValid("access-token", userDetails)).thenReturn(true);
        when(userDetailsService.loadUserByUsername("person@example.com")).thenReturn(userDetails);
        when(refreshTokenRepository.existsActiveSession(eq("session-1"), eq("person@example.com"),
                any(LocalDateTime.class))).thenReturn(true);

        invokeFilter();

        assertEquals(userDetails, SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(refreshTokenRepository).existsActiveSession(eq("session-1"), eq("person@example.com"),
                any(LocalDateTime.class));
    }

    private UserDetails userDetails() {
        return org.springframework.security.core.userdetails.User.withUsername("person@example.com")
                .password("ignored")
                .authorities("ROLE_USER")
                .build();
    }

    private void invokeFilter() throws Exception {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                jwtTokenProvider, userDetailsService, refreshTokenRepository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer access-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (servletRequest, servletResponse) -> { };
        filter.doFilter(request, response, chain);
    }
}
