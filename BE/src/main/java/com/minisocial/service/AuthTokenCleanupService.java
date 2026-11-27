package com.minisocial.service;

import com.minisocial.repository.EmailVerificationTokenRepository;
import com.minisocial.repository.PasswordResetTokenRepository;
import com.minisocial.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthTokenCleanupService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Scheduled(cron = "${app.auth.token-cleanup-cron:0 17 * * * *}")
    @Transactional
    public void deleteExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        long refreshCount = refreshTokenRepository.deleteByExpiresAtBefore(now);
        long resetCount = passwordResetTokenRepository.deleteByExpiresAtBefore(now);
        long verificationCount = emailVerificationTokenRepository.deleteByExpiresAtBefore(now);

        if (refreshCount + resetCount + verificationCount > 0) {
            log.info("Expired authentication credentials cleaned up: refresh={}, reset={}, verification={}",
                    refreshCount, resetCount, verificationCount);
        }
    }
}
