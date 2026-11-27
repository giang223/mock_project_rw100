package com.minisocial.repository;

import com.minisocial.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    long deleteByExpiresAtBefore(LocalDateTime cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rt FROM RefreshToken rt JOIN FETCH rt.user WHERE rt.tokenHash = :tokenHash")
    Optional<RefreshToken> findLockedByTokenHash(@Param("tokenHash") String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
            Long userId, LocalDateTime now);

    @Query("SELECT CASE WHEN COUNT(rt) > 0 THEN true ELSE false END FROM RefreshToken rt " +
            "WHERE rt.sessionId = :sessionId AND rt.user.email = :email " +
            "AND rt.revokedAt IS NULL AND rt.expiresAt > :now")
    boolean existsActiveSession(@Param("sessionId") String sessionId,
                                @Param("email") String email,
                                @Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT rt.sessionId FROM RefreshToken rt WHERE rt.user.id = :userId " +
            "AND rt.revokedAt IS NULL AND rt.expiresAt > :now")
    List<String> findActiveSessionIdsByUserId(@Param("userId") Long userId,
                                              @Param("now") LocalDateTime now);

    boolean existsByUserIdAndSessionIdAndRevokedAtIsNullAndExpiresAtAfter(
            Long userId, String sessionId, LocalDateTime now);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt " +
            "WHERE rt.user.id = :userId AND rt.revokedAt IS NULL")
    int revokeActiveSessionsByUserId(@Param("userId") Long userId,
                                     @Param("revokedAt") LocalDateTime revokedAt);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :revokedAt " +
            "WHERE rt.sessionId = :sessionId AND rt.revokedAt IS NULL")
    int revokeActiveSession(@Param("sessionId") String sessionId,
                            @Param("revokedAt") LocalDateTime revokedAt);
}
