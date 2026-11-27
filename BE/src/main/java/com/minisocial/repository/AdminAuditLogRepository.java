package com.minisocial.repository;

import com.minisocial.entity.AdminAuditLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT log FROM AdminAuditLog log WHERE " +
            "(:actorId IS NULL OR log.actor.id = :actorId) AND " +
            "(:targetUserId IS NULL OR log.targetUser.id = :targetUserId) AND " +
            "(:action IS NULL OR log.action = :action) AND " +
            "(:startAt IS NULL OR log.createdAt >= :startAt) AND " +
            "(:endBefore IS NULL OR log.createdAt < :endBefore) " +
            "ORDER BY log.createdAt DESC")
    Page<AdminAuditLog> search(@Param("actorId") Long actorId,
                               @Param("targetUserId") Long targetUserId,
                               @Param("action") String action,
                               @Param("startAt") LocalDateTime startAt,
                               @Param("endBefore") LocalDateTime endBefore,
                               Pageable pageable);
}
