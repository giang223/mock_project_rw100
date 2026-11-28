package com.minisocial.service;

import com.minisocial.entity.OAuthIdentity;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.OAuthIdentityRepository;
import com.minisocial.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

@Service
@ConditionalOnProperty(prefix = "app.auth.oauth", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class OAuthIdentityService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_NAME_LENGTH = 100;

    private final OAuthIdentityRepository oauthIdentityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public User resolveOrCreate(ExternalOAuthProfile profile) {
        validateSubject(profile);
        String subject = profile.subject().trim();

        OAuthIdentity identity = oauthIdentityRepository
                .findByProviderAndProviderSubject(profile.provider(), subject)
                .orElse(null);
        if (identity != null) {
            User user = identity.getUser();
            ensureAccountCanAuthenticate(user);
            String verifiedEmail = profile.emailVerified() ? normalizedEmail(profile) : null;
            if (verifiedEmail != null && !verifiedEmail.equals(identity.getProviderEmail())) {
                identity.setProviderEmail(verifiedEmail);
            }
            return user;
        }

        if (profile.provider() == OAuthIdentity.Provider.GOOGLE && !profile.emailVerified()) {
            throw new AppException(HttpStatus.UNAUTHORIZED,
                    "Nhà cung cấp OAuth không xác minh email cho tài khoản này");
        }

        String email = normalizedEmail(profile);
        if (email == null) {
            throw new AppException(HttpStatus.UNAUTHORIZED,
                    "Nhà cung cấp OAuth không trả về danh tính và email hợp lệ");
        }
        User user = userRepository.findLockedByEmail(email).orElse(null);
        if (user == null) {
            user = createOAuthOnlyUser(profile, email, profile.emailVerified());
            user = userRepository.save(user);
        } else {
            if (!profile.emailVerified()) {
                throw new AppException(HttpStatus.CONFLICT,
                        "Email OAuth chưa được xác minh bởi nhà cung cấp nên không thể liên kết tài khoản hiện có");
            }
            ensureAccountCanAuthenticate(user);
            if (!Boolean.TRUE.equals(user.getIsEmailVerified())) {
                user.setIsEmailVerified(true);
                user = userRepository.save(user);
            }
        }

        try {
            oauthIdentityRepository.saveAndFlush(OAuthIdentity.builder()
                    .user(user)
                    .provider(profile.provider())
                    .providerSubject(subject)
                    .providerEmail(email)
                    .build());
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Tài khoản OAuth vừa được liên kết. Vui lòng thử đăng nhập lại.");
        }
        return user;
    }

    private User createOAuthOnlyUser(ExternalOAuthProfile profile, String email, boolean emailVerified) {
        byte[] randomPassword = new byte[48];
        SECURE_RANDOM.nextBytes(randomPassword);
        String generatedPassword = Base64.getUrlEncoder().withoutPadding().encodeToString(randomPassword);
        String fullName = profile.fullName() == null || profile.fullName().isBlank()
                ? profile.provider().name() + " user"
                : profile.fullName().trim();
        if (fullName.length() > MAX_NAME_LENGTH) {
            fullName = fullName.substring(0, MAX_NAME_LENGTH).trim();
        }

        return User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(generatedPassword))
                .fullName(fullName.isBlank() ? profile.provider().name() + " user" : fullName)
                .avatarUrl(normalizeAvatarUrl(profile.avatarUrl()))
                .role(User.Role.USER)
                .isEmailVerified(emailVerified)
                .isActive(true)
                .build();
    }

    private void validateSubject(ExternalOAuthProfile profile) {
        if (profile == null || profile.provider() == null
                || profile.subject() == null || profile.subject().isBlank()
                || profile.subject().trim().length() > 191) {
            throw new AppException(HttpStatus.UNAUTHORIZED,
                    "Nhà cung cấp OAuth không trả về danh tính hợp lệ");
        }
    }

    private String normalizedEmail(ExternalOAuthProfile profile) {
        if (profile.email() == null || profile.email().isBlank()) {
            return null;
        }
        String email = profile.email().trim().toLowerCase(Locale.ROOT);
        return email.length() <= 255 ? email : null;
    }

    private void ensureAccountCanAuthenticate(User user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Tài khoản không thể tiếp tục đăng nhập");
        }
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }
        String normalized = avatarUrl.trim();
        if (normalized.length() > 500 || !(normalized.startsWith("https://") || normalized.startsWith("http://"))) {
            return null;
        }
        return normalized;
    }
}
