package com.minisocial.repository;

import com.minisocial.entity.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUserLowIdAndUserHighId(Long userLowId, Long userHighId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO conversations " +
            "(user_low_id,user_high_id,created_at) VALUES (:userLowId,:userHighId,:createdAt)",
            nativeQuery = true)
    int insertDirectIfAbsent(@Param("userLowId") Long userLowId,
                             @Param("userHighId") Long userHighId,
                             @Param("createdAt") LocalDateTime createdAt);

    @EntityGraph(attributePaths = {"userLow", "userHigh"})
    @Query("SELECT c FROM Conversation c WHERE " +
            "(c.userLow.id = :userId OR c.userHigh.id = :userId) AND " +
            "c.userLow.isActive = true AND c.userLow.isEmailVerified = true AND " +
            "c.userHigh.isActive = true AND c.userHigh.isEmailVerified = true AND " +
            "EXISTS (SELECT p FROM ConversationParticipant p WHERE p.conversation.id = c.id " +
            "AND p.user.id = :userId AND (p.hiddenAt IS NULL OR " +
            "(c.lastMessageAt IS NOT NULL AND c.lastMessageAt > p.hiddenAt))) AND " +
            "NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
            "(b.blocker.id = c.userLow.id AND b.blocked.id = c.userHigh.id) OR " +
            "(b.blocker.id = c.userHigh.id AND b.blocked.id = c.userLow.id)) " +
            "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC, c.id DESC")
    Page<Conversation> findVisibleByParticipant(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Conversation c " +
            "WHERE c.id = :conversationId AND " +
            "(c.userLow.id = :userId OR c.userHigh.id = :userId) AND " +
            "c.userLow.isActive = true AND c.userLow.isEmailVerified = true AND " +
            "c.userHigh.isActive = true AND c.userHigh.isEmailVerified = true AND " +
            "NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
            "(b.blocker.id = c.userLow.id AND b.blocked.id = c.userHigh.id) OR " +
            "(b.blocker.id = c.userHigh.id AND b.blocked.id = c.userLow.id))")
    boolean isVisibleToParticipant(@Param("conversationId") Long conversationId,
                                   @Param("userId") Long userId);
}
