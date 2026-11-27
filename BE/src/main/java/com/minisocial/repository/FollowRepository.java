package com.minisocial.repository;

import com.minisocial.entity.Follow;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    boolean existsByFollowerIdAndFolloweeIdAndStatus(Long followerId, Long followeeId, Follow.Status status);

    Optional<Follow> findByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    List<Follow> findByFolloweeIdAndStatusOrderByCreatedAtAsc(Long followeeId, Follow.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM Follow f WHERE f.follower.id = :followerId AND f.followee.id = :followeeId")
    Optional<Follow> findLockedByFollowerIdAndFolloweeId(@Param("followerId") Long followerId,
                                                         @Param("followeeId") Long followeeId);

    @Modifying
    @Query(value = "INSERT IGNORE INTO follows (follower_id, followee_id, status, created_at) " +
            "VALUES (:followerId, :followeeId, :status, :createdAt)", nativeQuery = true)
    int insertIfAbsent(@Param("followerId") Long followerId,
                       @Param("followeeId") Long followeeId,
                       @Param("status") String status,
                       @Param("createdAt") LocalDateTime createdAt);

    long deleteByFollowerIdAndFolloweeId(Long followerId, Long followeeId);

    long deleteByFollowerIdAndFolloweeIdAndStatus(Long followerId, Long followeeId, Follow.Status status);

    @Modifying
    @Query("DELETE FROM Follow f WHERE " +
            "(f.follower.id = :userId1 AND f.followee.id = :userId2) OR " +
            "(f.follower.id = :userId2 AND f.followee.id = :userId1)")
    int deleteBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query("SELECT f FROM Follow f WHERE f.followee.id = :userId " +
            "AND f.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
            "AND f.follower.isActive = true AND f.follower.isEmailVerified = true " +
            "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
            "(b.blocker.id = :currentUserId AND b.blocked.id = f.follower.id) OR " +
            "(b.blocker.id = f.follower.id AND b.blocked.id = :currentUserId)) " +
            "ORDER BY f.createdAt DESC")
    Page<Follow> findVisibleFollowers(@Param("userId") Long userId,
                                     @Param("currentUserId") Long currentUserId,
                                     Pageable pageable);

    @Query("SELECT f FROM Follow f WHERE f.follower.id = :userId " +
            "AND f.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
            "AND f.followee.isActive = true AND f.followee.isEmailVerified = true " +
            "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
            "(b.blocker.id = :currentUserId AND b.blocked.id = f.followee.id) OR " +
            "(b.blocker.id = f.followee.id AND b.blocked.id = :currentUserId)) " +
            "ORDER BY f.createdAt DESC")
    Page<Follow> findVisibleFollowing(@Param("userId") Long userId,
                                     @Param("currentUserId") Long currentUserId,
                                     Pageable pageable);

    @Query("SELECT f FROM Follow f WHERE f.followee.id = :userId AND f.status = :pending " +
            "AND f.follower.isActive = true AND f.follower.isEmailVerified = true " +
            "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
            "(b.blocker.id = :userId AND b.blocked.id = f.follower.id) OR " +
            "(b.blocker.id = f.follower.id AND b.blocked.id = :userId)) ORDER BY f.createdAt DESC")
    Page<Follow> findPendingRequests(@Param("userId") Long userId,
                                     @Param("pending") Follow.Status pending,
                                     Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Follow f " +
            "WHERE f.follower.id = :followerId AND f.followee.id = :followeeId " +
            "AND f.status = com.minisocial.entity.Follow.Status.ACCEPTED")
    boolean hasAcceptedFollow(@Param("followerId") Long followerId,
                              @Param("followeeId") Long followeeId);
}
