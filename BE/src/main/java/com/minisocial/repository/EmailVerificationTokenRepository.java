package com.minisocial.repository;

import com.minisocial.entity.EmailVerificationToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    long deleteByExpiresAtBefore(LocalDateTime cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
