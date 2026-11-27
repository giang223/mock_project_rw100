package com.minisocial.repository;

import com.minisocial.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    Optional<NotificationPreference> findByUserId(Long userId);

    @Modifying
    @Query(value = "INSERT INTO notification_preferences " +
            "(user_id, social_enabled, messages_enabled) VALUES (:userId, :social, :messages) AS incoming " +
            "ON DUPLICATE KEY UPDATE social_enabled = incoming.social_enabled, " +
            "messages_enabled = incoming.messages_enabled", nativeQuery = true)
    int upsert(@Param("userId") Long userId,
               @Param("social") boolean socialEnabled,
               @Param("messages") boolean messagesEnabled);
}
