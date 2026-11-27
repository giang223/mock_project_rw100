package com.minisocial.repository;

import com.minisocial.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findLockedById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findLockedByEmail(@Param("email") String email);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    List<User> findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(Collection<String> usernames);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    long countByIsActiveTrue();

    long countByRoleAndIsActiveTrueAndIsEmailVerifiedTrue(User.Role role);

    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:active IS NULL OR u.isActive = :active)")
    Page<User> searchForAdmin(@Param("keyword") String keyword,
                              @Param("role") User.Role role,
                              @Param("active") Boolean active,
                              Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND u.isActive = true AND u.isEmailVerified = true AND u.id != :currentUserId " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :currentUserId AND b.blocked.id = u.id) OR " +
           "(b.blocker.id = u.id AND b.blocked.id = :currentUserId))")
    Page<User> searchUsers(@Param("keyword") String keyword,
                           @Param("currentUserId") Long currentUserId,
                           Pageable pageable);

    @Query(value = """
            SELECT u.id AS id, u.full_name AS fullName, u.username AS username,
                   u.avatar_url AS avatarUrl, u.bio AS bio,
                   (SELECT COUNT(DISTINCT CASE WHEN f1.requester_id = :currentUserId
                                               THEN f1.addressee_id ELSE f1.requester_id END)
                    FROM friendships f1
                    JOIN friendships f2 ON f2.status = 'ACCEPTED'
                      AND (CASE WHEN f1.requester_id = :currentUserId
                                THEN f1.addressee_id ELSE f1.requester_id END) =
                          (CASE WHEN f2.requester_id = u.id
                                THEN f2.addressee_id ELSE f2.requester_id END)
                    WHERE f1.status = 'ACCEPTED'
                      AND (f1.requester_id = :currentUserId OR f1.addressee_id = :currentUserId)
                      AND (f2.requester_id = u.id OR f2.addressee_id = u.id)) AS mutualFriendCount
            FROM users u
            WHERE u.is_active = TRUE AND u.is_email_verified = TRUE AND u.id <> :currentUserId
              AND NOT EXISTS (SELECT 1 FROM friendships f WHERE
                  (f.requester_id = :currentUserId AND f.addressee_id = u.id) OR
                  (f.requester_id = u.id AND f.addressee_id = :currentUserId))
              AND NOT EXISTS (SELECT 1 FROM follows f WHERE
                  (f.follower_id = :currentUserId AND f.followee_id = u.id) OR
                  (f.follower_id = u.id AND f.followee_id = :currentUserId))
              AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE
                  (b.blocker_id = :currentUserId AND b.blocked_id = u.id) OR
                  (b.blocker_id = u.id AND b.blocked_id = :currentUserId))
            ORDER BY mutualFriendCount DESC, u.id ASC
            """,
            countQuery = """
            SELECT COUNT(*) FROM users u
            WHERE u.is_active = TRUE AND u.is_email_verified = TRUE AND u.id <> :currentUserId
              AND NOT EXISTS (SELECT 1 FROM friendships f WHERE
                  (f.requester_id = :currentUserId AND f.addressee_id = u.id) OR
                  (f.requester_id = u.id AND f.addressee_id = :currentUserId))
              AND NOT EXISTS (SELECT 1 FROM follows f WHERE
                  (f.follower_id = :currentUserId AND f.followee_id = u.id) OR
                  (f.follower_id = u.id AND f.followee_id = :currentUserId))
              AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE
                  (b.blocker_id = :currentUserId AND b.blocked_id = u.id) OR
                  (b.blocker_id = u.id AND b.blocked_id = :currentUserId))
            """,
            nativeQuery = true)
    Page<FriendSuggestionProjection> findFriendSuggestions(@Param("currentUserId") Long currentUserId,
                                                           Pageable pageable);

    interface FriendSuggestionProjection {
        Long getId();
        String getFullName();
        String getUsername();
        String getAvatarUrl();
        String getBio();
        Long getMutualFriendCount();
    }
}
