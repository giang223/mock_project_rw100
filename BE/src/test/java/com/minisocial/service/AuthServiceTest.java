package com.minisocial.service;

import com.minisocial.entity.RefreshToken;
import com.minisocial.entity.PasswordResetToken;
import com.minisocial.entity.User;
import com.minisocial.dto.request.LoginRequest;
import com.minisocial.dto.request.ResetPasswordRequest;
import com.minisocial.exception.AppException;
import com.minisocial.repository.EmailVerificationTokenRepository;
import com.minisocial.repository.PasswordResetTokenRepository;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.security.JwtTokenProvider;
import com.minisocial.security.UserDetailsServiceImpl;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsServiceImpl userDetailsService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private SecurityUtils securityUtils;

    @InjectMocks private AuthService authService;

    @Test
    void loginNormalizesEmailAndStoresOnlyTheRefreshTokenHash() {
        String refreshToken = "login-refresh-token";
        User user = User.builder()
                .id(11L).email("person@example.com").fullName("Test User")
                .role(User.Role.USER).isActive(true).isEmailVerified(true).isPrivate(false)
                .build();
        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail()).password("not-used").authorities("ROLE_USER").build();
        LoginRequest request = new LoginRequest();
        request.setEmail("  PERSON@EXAMPLE.COM ");
        request.setPassword("correct-password");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(details);
        when(jwtTokenProvider.generateAccessToken(eq(details), anyString())).thenAnswer(invocation ->
                "access:" + invocation.getArgument(1));
        when(jwtTokenProvider.generateRefreshToken(details)).thenReturn(refreshToken);
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ReflectionTestUtils.setField(authService, "refreshTokenExpiration", 604_800_000L);

        AuthSession result = authService.login(request);

        assertTrue(result.getResponse().getAccessToken().startsWith("access:"));
        assertEquals(refreshToken, result.getRefreshToken());
        ArgumentCaptor<UsernamePasswordAuthenticationToken> authentication =
                ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
        verify(authenticationManager).authenticate(authentication.capture());
        assertEquals(user.getEmail(), authentication.getValue().getPrincipal());
        ArgumentCaptor<RefreshToken> storedToken = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(storedToken.capture());
        assertEquals(user.getId(), storedToken.getValue().getUser().getId());
        assertEquals(com.minisocial.util.TokenHashing.sha256(refreshToken),
                storedToken.getValue().getTokenHash());
        assertEquals(result.getResponse().getAccessToken().substring("access:".length()),
                storedToken.getValue().getSessionId());
    }

    @Test
    void replayedRefreshTokenRevokesItsDeviceSession() {
        String rawToken = "replayed-refresh-token";
        String sessionId = "session-123";
        RefreshToken stored = RefreshToken.builder()
                .user(User.builder().id(7L).email("person@example.com").build())
                .sessionId(sessionId)
                .tokenHash(com.minisocial.util.TokenHashing.sha256(rawToken))
                .expiresAt(LocalDateTime.now().plusDays(1))
                .revokedAt(LocalDateTime.now().minusMinutes(1))
                .build();
        when(refreshTokenRepository.findLockedByTokenHash(stored.getTokenHash()))
                .thenReturn(Optional.of(stored));

        AppException exception = assertThrows(AppException.class,
                () -> authService.refreshToken(rawToken));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        verify(refreshTokenRepository).revokeActiveSession(eq(sessionId), any(LocalDateTime.class));
    }

    @Test
    void refreshRotatesTokenWithinTheSameSession() {
        String rawToken = "active-refresh-token";
        String sessionId = "session-456";
        User user = User.builder()
                .id(9L).email("person@example.com").fullName("Test User")
                .role(User.Role.USER).isActive(true).isEmailVerified(true).isPrivate(false)
                .build();
        RefreshToken stored = RefreshToken.builder()
                .user(user).sessionId(sessionId)
                .tokenHash(com.minisocial.util.TokenHashing.sha256(rawToken))
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
        UserDetails details = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail()).password("not-used").authorities("ROLE_USER").build();
        when(refreshTokenRepository.findLockedByTokenHash(stored.getTokenHash()))
                .thenReturn(Optional.of(stored));
        when(jwtTokenProvider.validateRefreshToken(rawToken)).thenReturn(true);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(details);
        when(jwtTokenProvider.generateAccessToken(details, sessionId)).thenReturn("next-access-token");
        when(jwtTokenProvider.generateRefreshToken(details)).thenReturn("next-refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ReflectionTestUtils.setField(authService, "refreshTokenExpiration", 604_800_000L);

        AuthSession result = authService.refreshToken(rawToken);

        assertEquals("next-access-token", result.getResponse().getAccessToken());
        assertEquals("next-refresh-token", result.getRefreshToken());
        assertNotNull(stored.getRevokedAt());
        assertEquals(com.minisocial.util.TokenHashing.sha256("next-refresh-token"), stored.getReplacedByHash());
        verify(refreshTokenRepository, org.mockito.Mockito.times(2)).save(any(RefreshToken.class));
    }

    @Test
    void logoutRevokesTheSessionAssociatedWithTheRefreshCookie() {
        String rawToken = "logout-refresh-token";
        String sessionId = "logout-session";
        RefreshToken stored = RefreshToken.builder()
                .user(User.builder().id(12L).email("person@example.com").build())
                .sessionId(sessionId)
                .tokenHash(com.minisocial.util.TokenHashing.sha256(rawToken))
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
        when(refreshTokenRepository.findLockedByTokenHash(stored.getTokenHash()))
                .thenReturn(Optional.of(stored));

        authService.logout(rawToken);

        verify(refreshTokenRepository).revokeActiveSession(eq(sessionId), any(LocalDateTime.class));
    }

    @Test
    void revokingCurrentSessionSignalsControllerToClearItsCookie() {
        Long userId = 12L;
        String rawToken = "current-session-refresh-token";
        String sessionId = "current-session";
        RefreshToken stored = RefreshToken.builder()
                .user(User.builder().id(userId).email("person@example.com").build())
                .sessionId(sessionId)
                .tokenHash(com.minisocial.util.TokenHashing.sha256(rawToken))
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
        when(refreshTokenRepository.existsByUserIdAndSessionIdAndRevokedAtIsNullAndExpiresAtAfter(
                eq(userId), eq(sessionId), any(LocalDateTime.class))).thenReturn(true);
        when(refreshTokenRepository.findLockedByTokenHash(stored.getTokenHash()))
                .thenReturn(Optional.of(stored));

        boolean shouldClearCookie = authService.revokeSession(sessionId, rawToken);

        assertTrue(shouldClearCookie);
        verify(refreshTokenRepository).revokeActiveSession(eq(sessionId), any(LocalDateTime.class));
    }

    @Test
    void revokeAllSessionsUsesTheAuthenticatedUserId() {
        when(securityUtils.getCurrentUserId()).thenReturn(13L);

        authService.revokeAllSessions();

        verify(refreshTokenRepository).revokeActiveSessionsByUserId(eq(13L), any(LocalDateTime.class));
    }

    @Test
    void resetPasswordLocksAccountBeforeTokenAndInvalidatesAllResetAndRefreshSessions() {
        User user = User.builder().id(14L).email("person@example.com").passwordHash("old-hash")
                .isActive(true).isEmailVerified(true).build();
        String rawToken = "one-time-reset-token";
        String tokenHash = com.minisocial.util.TokenHashing.sha256(rawToken);
        PasswordResetToken resetToken = PasswordResetToken.builder().id(21L).user(user)
                .tokenHash(tokenHash).expiresAt(LocalDateTime.now().plusMinutes(30)).used(false).build();
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("new-password-123");
        request.setConfirmPassword("new-password-123");
        when(passwordResetTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(resetToken));
        when(userRepository.findLockedById(user.getId())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findLockedByTokenHash(tokenHash)).thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("new-password-123")).thenReturn("new-password-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.resetPassword(request);

        assertEquals("new-password-hash", user.getPasswordHash());
        verify(passwordResetTokenRepository).deleteByUserId(user.getId());
        verify(refreshTokenRepository).revokeActiveSessionsByUserId(eq(user.getId()), any(LocalDateTime.class));
        var lockOrder = inOrder(passwordResetTokenRepository, userRepository);
        lockOrder.verify(passwordResetTokenRepository).findByTokenHash(tokenHash);
        lockOrder.verify(userRepository).findLockedById(user.getId());
        lockOrder.verify(passwordResetTokenRepository).findLockedByTokenHash(tokenHash);
    }
}
