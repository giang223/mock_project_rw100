package com.minisocial.repository;

import com.minisocial.entity.Friendship;
import com.minisocial.entity.Post;
import com.minisocial.entity.Story;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface StoryRepository extends JpaRepository<Story, Long> {

    @Query("SELECT s FROM Story s WHERE s.isDeleted = false AND s.expiresAt > :now " +
           "AND s.author.isActive = true AND s.author.isEmailVerified = true " +
           "AND (:authorId IS NULL OR s.author.id = :authorId) " +
           "AND (s.author.id = :currentUserId OR s.visibility = :publicVisibility OR " +
           "(s.visibility = :friendsVisibility AND EXISTS (SELECT f FROM Friendship f " +
           "WHERE f.status = :acceptedStatus AND " +
           "((f.requester.id = s.author.id AND f.addressee.id = :currentUserId) OR " +
           "(f.requester.id = :currentUserId AND f.addressee.id = s.author.id))))) " +
           "AND (s.author.id = :currentUserId OR s.author.isPrivate = false OR EXISTS (SELECT af FROM Follow af " +
           "WHERE af.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
           "AND af.follower.id = :currentUserId AND af.followee.id = s.author.id)) " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :currentUserId AND b.blocked.id = s.author.id) OR " +
           "(b.blocker.id = s.author.id AND b.blocked.id = :currentUserId)) " +
           "ORDER BY s.createdAt DESC")
    Page<Story> findVisibleToUser(@Param("authorId") Long authorId,
                                  @Param("currentUserId") Long currentUserId,
                                  @Param("publicVisibility") Post.Visibility publicVisibility,
                                  @Param("friendsVisibility") Post.Visibility friendsVisibility,
                                  @Param("acceptedStatus") Friendship.Status acceptedStatus,
                                  @Param("now") LocalDateTime now,
                                  Pageable pageable);

    Optional<Story> findByIdAndIsDeletedFalse(Long id);
}
