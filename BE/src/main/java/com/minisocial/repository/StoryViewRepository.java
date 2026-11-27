package com.minisocial.repository;

import com.minisocial.entity.StoryView;
import com.minisocial.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    @Modifying
    @Query(value = "INSERT IGNORE INTO story_views (story_id, viewer_id, viewed_at) " +
            "VALUES (:storyId, :viewerId, :viewedAt)", nativeQuery = true)
    int insertIfAbsent(@Param("storyId") Long storyId,
                       @Param("viewerId") Long viewerId,
                       @Param("viewedAt") LocalDateTime viewedAt);

    @Query("SELECT sv.story.id AS storyId, COUNT(sv.id) AS viewCount FROM StoryView sv " +
            "WHERE sv.story.id IN :storyIds GROUP BY sv.story.id")
    List<StoryViewCount> findViewCounts(@Param("storyIds") Collection<Long> storyIds);

    @Query("SELECT sv.viewer FROM StoryView sv WHERE sv.story.id = :storyId " +
            "AND sv.viewer.isActive = true AND sv.viewer.isEmailVerified = true ORDER BY sv.viewedAt DESC")
    Page<User> findViewers(@Param("storyId") Long storyId, Pageable pageable);

    interface StoryViewCount {
        Long getStoryId();
        long getViewCount();
    }
}
