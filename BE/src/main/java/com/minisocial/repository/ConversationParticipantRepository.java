package com.minisocial.repository;

import com.minisocial.entity.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    List<ConversationParticipant> findByUserIdAndConversationIdIn(Long userId, Collection<Long> conversationIds);

    List<ConversationParticipant> findByConversationIdAndUserIdNot(Long conversationId, Long userId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO conversation_participants " +
            "(conversation_id,user_id,joined_at) VALUES (:conversationId,:userId,:joinedAt)",
            nativeQuery = true)
    int insertIfAbsent(@Param("conversationId") Long conversationId,
                       @Param("userId") Long userId,
                       @Param("joinedAt") LocalDateTime joinedAt);

    @Modifying
    @Query("UPDATE ConversationParticipant p SET p.lastReadAt = :readAt " +
            "WHERE p.conversation.id = :conversationId AND p.user.id = :userId")
    int updateLastReadAt(@Param("conversationId") Long conversationId,
                         @Param("userId") Long userId,
                         @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("UPDATE ConversationParticipant p SET p.hiddenAt = :hiddenAt " +
            "WHERE p.conversation.id = :conversationId AND p.user.id = :userId")
    int updateHiddenAt(@Param("conversationId") Long conversationId,
                       @Param("userId") Long userId,
                       @Param("hiddenAt") LocalDateTime hiddenAt);

    @Modifying
    @Query("UPDATE ConversationParticipant p SET p.hiddenAt = NULL " +
            "WHERE p.conversation.id = :conversationId")
    int unhideForAllParticipants(@Param("conversationId") Long conversationId);

    @Modifying
    @Query("UPDATE ConversationParticipant p SET p.contactNickname = :nickname " +
            "WHERE p.conversation.id = :conversationId AND p.user.id = :userId")
    int updateContactNickname(@Param("conversationId") Long conversationId,
                              @Param("userId") Long userId,
                              @Param("nickname") String nickname);

    @Query("SELECT p.conversation.id AS conversationId, COUNT(m.id) AS unreadCount " +
            "FROM ConversationParticipant p JOIN DirectMessage m ON m.conversation.id = p.conversation.id " +
            "WHERE p.user.id = :userId AND p.conversation.id IN :conversationIds " +
            "AND m.sender.id <> :userId AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt) " +
            "GROUP BY p.conversation.id")
    List<UnreadCountProjection> findUnreadCounts(@Param("userId") Long userId,
                                                 @Param("conversationIds") Collection<Long> conversationIds);

    interface UnreadCountProjection {
        Long getConversationId();
        long getUnreadCount();
    }
}
