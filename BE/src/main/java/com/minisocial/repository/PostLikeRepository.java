package com.minisocial.repository;

import com.minisocial.entity.PostLike;
import com.minisocial.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    long countByPostId(Long postId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO post_likes (post_id, user_id, reaction_type, created_at) " +
            "VALUES (:postId, :userId, :reactionType, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("postId") Long postId,
                       @Param("userId") Long userId,
                       @Param("reactionType") String reactionType,
                       @Param("createdAt") LocalDateTime createdAt);

    @Modifying
    @Query(value = "UPDATE post_likes SET reaction_type = :reactionType " +
            "WHERE post_id = :postId AND user_id = :userId", nativeQuery = true)
    int updateReactionType(@Param("postId") Long postId,
                           @Param("userId") Long userId,
                           @Param("reactionType") String reactionType);

    long deleteByPostIdAndUserId(Long postId, Long userId);

    @Query("SELECT pl.user FROM PostLike pl WHERE pl.post.id = :postId " +
            "AND pl.user.isActive = true AND pl.user.isEmailVerified = true " +
            "ORDER BY pl.createdAt DESC")
    Page<User> findUsersByPostId(@Param("postId") Long postId, Pageable pageable);

    @Query("SELECT pl.reactionType AS reactionType, COUNT(pl.id) AS reactionCount, " +
            "SUM(CASE WHEN pl.user.id = :currentUserId THEN 1 ELSE 0 END) AS currentUserCount " +
            "FROM PostLike pl WHERE pl.post.id = :postId GROUP BY pl.reactionType")
    List<ReactionSummaryProjection> findReactionSummaryByPostId(@Param("postId") Long postId,
                                                                 @Param("currentUserId") Long currentUserId);

    interface ReactionSummaryProjection {
        PostLike.ReactionType getReactionType();
        Long getReactionCount();
        Long getCurrentUserCount();
    }
}
