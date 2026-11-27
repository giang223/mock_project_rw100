package com.minisocial.repository;

import com.minisocial.entity.PostHashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PostHashtagRepository extends JpaRepository<PostHashtag, Long> {

    long deleteByPostId(Long postId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO post_hashtags (post_id, hashtag_id, created_at) " +
            "VALUES (:postId, :hashtagId, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("postId") Long postId,
                       @Param("hashtagId") Long hashtagId,
                       @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT ph.hashtag.name FROM PostHashtag ph WHERE ph.post.id = :postId ORDER BY ph.hashtag.name")
    List<String> findNamesByPostId(@Param("postId") Long postId);
}
