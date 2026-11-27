package com.minisocial.service;

import com.minisocial.dto.request.*;
import com.minisocial.dto.response.AuthResponse;
import com.minisocial.dto.response.AuthSessionResponse;
import com.minisocial.dto.response.RegisterResponse;
import com.minisocial.dto.response.UserResponse;
import com.minisocial.entity.*;
import com.minisocial.exception.AppException;
import com.minisocial.repository.*;
import com.minisocial.security.JwtTokenProvider;
import com.minisocial.security.UserDetailsServiceImpl;
import com.minisocial.util.TokenHashing;
import com.minisocial.util.SecurityUtils;
import org.springframework.context.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.UUID;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsServiceImpl userDetailsService;
    private final ApplicationEventPublisher eventPublisher;
    private final SecurityUtils securityUtils;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        String normalizedFullName = request.getFullName().trim();
        if (normalizedFullName.length() < 2 || normalizedFullName.length() > 100) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Họ và tên phải từ 2 đến 100 ký tự");
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(HttpStatus.CONFLICT, "Email này đã được sử dụng");
        }

        String normalizedUsername = normalizeOptionalUsername(request.getUsername());
        if (normalizedUsername != null && userRepository.existsByUsername(normalizedUsername)) {
            throw new AppException(HttpStatus.CONFLICT, "Username này đã được sử dụng");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(normalizedFullName)
                .username(normalizedUsername)
                .phone(normalizeOptionalValue(request.getPhone()))
                .role(User.Role.USER)
                .isEmailVerified(false)
                .isActive(true)
                .build();

        userRepository.save(user);

        String verificationCode = generateAndSaveEmailCode(user);
        eventPublisher.publishEvent(new VerificationEmailRequested(
                user.getEmail(), user.getFullName(), verificationCode));

        return RegisterResponse.builder()
                .email(user.getEmail())
                .username(user.getUsername())
                .requiresEmailVerification(true)
                .build();
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtTokenProvider.generateAccessToken(userDetails, sessionId);
        String refreshToken = createRefreshToken(user, userDetails, sessionId);

        return new AuthSession(AuthResponse.of(accessToken, mapToUserResponse(user)), refreshToken);
    }

    @Transactional
    public AuthSession createOAuthSession(Long userId) {
        User user = userRepository.findLockedById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập"));
        if (!Boolean.TRUE.equals(user.getIsActive()) || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập");
        }
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String sessionId = UUID.randomUUID().toString();
        String accessToken = jwtTokenProvider.generateAccessToken(userDetails, sessionId);
        String refreshToken = createRefreshToken(user, userDetails, sessionId);
        return new AuthSession(AuthResponse.of(accessToken, mapToUserResponse(user)), refreshToken);
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthSession refreshToken(String refreshTokenStr) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ");
        }

        RefreshToken storedToken = refreshTokenRepository.findLockedByTokenHash(TokenHashing.sha256(refreshTokenStr))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));

        if (storedToken.getRevokedAt() != null) {
            // A rotated token was presented again. Revoke the whole device session.
            refreshTokenRepository.revokeActiveSession(storedToken.getSessionId(), LocalDateTime.now());
            throw new AppException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.");
        }

        if (storedToken.isExpired() || !jwtTokenProvider.validateRefreshToken(refreshTokenStr)) {
            refreshTokenRepository.revokeActiveSession(storedToken.getSessionId(), LocalDateTime.now());
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
        }

        User user = storedToken.getUser();
        if (!Boolean.TRUE.equals(user.getIsActive()) || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
            refreshTokenRepository.revokeActiveSession(storedToken.getSessionId(), LocalDateTime.now());
            throw new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập");
        }
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String newAccessToken = jwtTokenProvider.generateAccessToken(userDetails, storedToken.getSessionId());
        String newRefreshToken = rotateRefreshToken(storedToken, userDetails);

        return new AuthSession(AuthResponse.of(newAccessToken, mapToUserResponse(user)), newRefreshToken);
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return;
        }
        refreshTokenRepository.findLockedByTokenHash(TokenHashing.sha256(refreshTokenStr))
                .ifPresent(token -> refreshTokenRepository.revokeActiveSession(
                        token.getSessionId(), LocalDateTime.now()));
    }

    @Transactional(readOnly = true)
    public List<AuthSessionResponse> getActiveSessions(String currentRefreshToken) {
        Long userId = securityUtils.getCurrentUserId();
        String currentTokenHash = currentRefreshToken == null || currentRefreshToken.isBlank()
                ? null
                : TokenHashing.sha256(currentRefreshToken);

        return refreshTokenRepository
                .findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(userId, LocalDateTime.now())
                .stream()
                .map(token -> AuthSessionResponse.builder()
                        .sessionId(token.getSessionId())
                        .lastActivityAt(token.getCreatedAt())
                        .expiresAt(token.getExpiresAt())
                        .currentSession(currentTokenHash != null
                                && Objects.equals(currentTokenHash, token.getTokenHash()))
                        .build())
                .toList();
    }

    @Transactional
    public boolean revokeSession(String sessionId, String currentRefreshToken) {
        Long userId = securityUtils.getCurrentUserId();
        if (!refreshTokenRepository.existsByUserIdAndSessionIdAndRevokedAtIsNullAndExpiresAtAfter(
                userId, sessionId, LocalDateTime.now())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Phiên đăng nhập không tồn tại hoặc đã bị thu hồi");
        }

        String currentTokenHash = currentRefreshToken == null || currentRefreshToken.isBlank()
                ? null
                : TokenHashing.sha256(currentRefreshToken);
        boolean revokeCurrentCookieSession = currentTokenHash != null
                && refreshTokenRepository.findLockedByTokenHash(currentTokenHash)
                    .map(token -> Objects.equals(sessionId, token.getSessionId()))
                    .orElse(false);

        refreshTokenRepository.revokeActiveSession(sessionId, LocalDateTime.now());
        return revokeCurrentCookieSession;
    }

    @Transactional
    public void revokeAllSessions() {
        refreshTokenRepository.revokeActiveSessionsByUserId(
                securityUtils.getCurrentUserId(), LocalDateTime.now());
    }

    @Transactional(noRollbackFor = AppException.class)
    public void verifyEmail(String email, String code) {
        User user = userRepository.findLockedByEmail(normalizeEmail(email))
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Email hoặc mã xác minh không hợp lệ"));
        if (Boolean.TRUE.equals(user.getIsEmailVerified())) {
            return;
        }

        EmailVerificationToken verificationToken = emailVerificationTokenRepository
                .findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Email hoặc mã xác minh không hợp lệ"));

        if (verificationToken.isExpired()) {
            emailVerificationTokenRepository.delete(verificationToken);
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại.");
        }

        if (verificationToken.getAttempts() >= 5) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã nhập sai quá số lần cho phép. Hãy gửi mã mới.");
        }
        if (!passwordEncoder.matches(code, verificationToken.getCodeHash())) {
            verificationToken.setAttempts(verificationToken.getAttempts() + 1);
            throw new AppException(HttpStatus.BAD_REQUEST, "Email hoặc mã xác minh không hợp lệ");
        }

        user.setIsEmailVerified(true);
        userRepository.save(user);

        emailVerificationTokenRepository.deleteByUserId(user.getId());
    }

    @Transactional
    public void resendVerification(String email) {
        userRepository.findLockedByEmail(normalizeEmail(email)).ifPresent(user -> {
            if (!Boolean.TRUE.equals(user.getIsActive())
                    || Boolean.TRUE.equals(user.getIsEmailVerified())) {
                return;
            }

            EmailVerificationToken latest = emailVerificationTokenRepository
                    .findTopByUserIdOrderByCreatedAtDesc(user.getId()).orElse(null);
            if (latest != null && latest.getCreatedAt() != null
                    && latest.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(60))) {
                return;
            }

            String code = generateAndSaveEmailCode(user);
            eventPublisher.publishEvent(new VerificationEmailRequested(
                    user.getEmail(), user.getFullName(), code));
        });
    }

    @Transactional
    public void forgotPassword(String email) {
        // Always return success to prevent email enumeration
        userRepository.findLockedByEmail(normalizeEmail(email)).ifPresent(user -> {
            if (!Boolean.TRUE.equals(user.getIsActive())
                    || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
                return;
            }
            passwordResetTokenRepository.deleteByUserId(user.getId());
            String token = generateResetToken();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(TokenHashing.sha256(token))
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);
            eventPublisher.publishEvent(new PasswordResetEmailRequested(
                    user.getEmail(), user.getFullName(), token));
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }

        String tokenHash = TokenHashing.sha256(request.getToken());
        PasswordResetToken candidate = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Token không hợp lệ hoặc đã được sử dụng"));

        // Every password lifecycle operation locks the account row before token rows.
        // That stable lock order serializes reset issuance, reset consumption, and password changes.
        User user = userRepository.findLockedById(candidate.getUser().getId())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Token không hợp lệ hoặc đã được sử dụng"));
        PasswordResetToken resetToken = passwordResetTokenRepository.findLockedByTokenHash(tokenHash)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Token không hợp lệ hoặc đã được sử dụng"));

        if (resetToken.getUsed() || resetToken.isExpired()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Token đã hết hạn hoặc đã được sử dụng");
        }

        if (!user.getId().equals(resetToken.getUser().getId())
                || !Boolean.TRUE.equals(user.getIsActive())
                || !Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Token không hợp lệ hoặc đã được sử dụng");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        passwordResetTokenRepository.deleteByUserId(user.getId());

        // Invalidate all refresh tokens for this user
        refreshTokenRepository.revokeActiveSessionsByUserId(user.getId(), LocalDateTime.now());
    }

    // ---- Helper methods ----

    private String generateAndSaveEmailCode(User user) {
        emailVerificationTokenRepository.deleteByUserId(user.getId());
        String code = "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
        EmailVerificationToken verToken = EmailVerificationToken.builder()
                .user(user)
                .codeHash(passwordEncoder.encode(code))
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .attempts(0)
                .build();
        emailVerificationTokenRepository.save(verToken);
        return code;
    }

    private String createRefreshToken(User user, UserDetails userDetails, String sessionId) {
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(userDetails);
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .sessionId(sessionId)
                .tokenHash(TokenHashing.sha256(refreshTokenStr))
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);
        return refreshTokenStr;
    }

    private String rotateRefreshToken(RefreshToken currentToken, UserDetails userDetails) {
        String refreshTokenStr = jwtTokenProvider.generateRefreshToken(userDetails);
        String tokenHash = TokenHashing.sha256(refreshTokenStr);
        currentToken.setRevokedAt(LocalDateTime.now());
        currentToken.setReplacedByHash(tokenHash);
        refreshTokenRepository.save(currentToken);
        createRefreshToken(currentToken.getUser(), userDetails, currentToken.getSessionId(), tokenHash);
        return refreshTokenStr;
    }

    private void createRefreshToken(User user, UserDetails userDetails, String sessionId, String tokenHash) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .sessionId(sessionId)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String normalizeOptionalUsername(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return username.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private String normalizeOptionalValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .phone(user.getPhone())
                .birthday(user.getBirthday())
                .gender(user.getGender())
                .address(user.getAddress())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .coverUrl(user.getCoverUrl())
                .role(user.getRole())
                .isEmailVerified(user.getIsEmailVerified())
                .isPrivate(user.getIsPrivate())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
