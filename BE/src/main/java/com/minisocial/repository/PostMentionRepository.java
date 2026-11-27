package com.minisocial.repository;

import com.minisocial.entity.PostMention;
import com.minisocial.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PostMentionRepository extends JpaRepository<PostMention, Long> {

    List<PostMention> findByPostId(Long postId);

    long deleteByPostId(Long postId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO post_mentions (post_id, user_id, created_at) " +
            "VALUES (:postId, :userId, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("postId") Long postId,
                       @Param("userId") Long userId,
                       @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT mention.user FROM PostMention mention " +
            "WHERE mention.post.id = :postId ORDER BY mention.user.username")
    List<User> findMentionedUsersByPostId(@Param("postId") Long postId);
}
