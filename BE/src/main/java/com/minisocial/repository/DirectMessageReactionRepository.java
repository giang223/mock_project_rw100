package com.minisocial.repository;

import com.minisocial.entity.DirectMessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface DirectMessageReactionRepository extends JpaRepository<DirectMessageReaction, Long> {

    List<DirectMessageReaction> findByDirectMessageIdInAndUserId(Collection<Long> messageIds, Long userId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO direct_message_reactions " +
            "(direct_message_id, user_id, reaction_type, created_at) " +
            "VALUES (:messageId, :userId, :reactionType, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("messageId") Long messageId,
                       @Param("userId") Long userId,
                       @Param("reactionType") String reactionType,
                       @Param("createdAt") LocalDateTime createdAt);

    @Modifying
    @Query(value = "UPDATE direct_message_reactions SET reaction_type = :reactionType " +
            "WHERE direct_message_id = :messageId AND user_id = :userId", nativeQuery = true)
    int updateReactionType(@Param("messageId") Long messageId,
                           @Param("userId") Long userId,
                           @Param("reactionType") String reactionType);

    long deleteByDirectMessageIdAndUserId(Long messageId, Long userId);

    @Query("SELECT reaction.directMessage.id AS messageId, reaction.reactionType AS reactionType, " +
            "COUNT(reaction.id) AS reactionCount FROM DirectMessageReaction reaction " +
            "WHERE reaction.directMessage.id IN :messageIds " +
            "GROUP BY reaction.directMessage.id, reaction.reactionType")
    List<ReactionCountProjection> findCountsByMessageIds(@Param("messageIds") Collection<Long> messageIds);

    interface ReactionCountProjection {
        Long getMessageId();
        DirectMessageReaction.Type getReactionType();
        Long getReactionCount();
    }
}
