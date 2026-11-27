package com.minisocial.repository;

import com.minisocial.entity.DirectMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    Page<DirectMessage> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    @Modifying
    @Query(value = "UPDATE conversations SET last_message_at = GREATEST(COALESCE(last_message_at, :sentAt), :sentAt) " +
            "WHERE id = :conversationId", nativeQuery = true)
    int updateLastMessageAt(@Param("conversationId") Long conversationId,
                            @Param("sentAt") java.time.LocalDateTime sentAt);

    @Query(value = "SELECT ranked.id AS id, ranked.conversation_id AS conversationId, " +
            "ranked.sender_id AS senderId, ranked.content AS content, ranked.media_url AS mediaUrl, " +
            "ranked.media_type AS mediaType, ranked.created_at AS createdAt " +
            "FROM (SELECT m.id, m.conversation_id, m.sender_id, m.content, m.media_url, m.media_type, m.created_at, " +
            "ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC, m.id DESC) AS row_num " +
            "FROM direct_messages m WHERE m.conversation_id IN (:conversationIds)) ranked " +
            "WHERE ranked.row_num = 1", nativeQuery = true)
    List<LatestMessageProjection> findLatestForConversations(
            @Param("conversationIds") Collection<Long> conversationIds);

    interface LatestMessageProjection {
        Long getId();
        Long getConversationId();
        Long getSenderId();
        String getContent();
        String getMediaUrl();
        String getMediaType();
        java.time.LocalDateTime getCreatedAt();
    }
}
