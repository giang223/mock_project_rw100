package com.minisocial.repository;

import com.minisocial.entity.Friendship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // Find any friendship between two users (regardless of direction)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :userId1 AND f.addressee.id = :userId2) OR " +
           "(f.requester.id = :userId2 AND f.addressee.id = :userId1)")
    Optional<Friendship> findBetweenUsers(@Param("userId1") Long userId1,
                                          @Param("userId2") Long userId2);

    // Received pending requests (someone sent to me)
    Page<Friendship> findByAddresseeIdAndStatus(Long addresseeId,
                                                Friendship.Status status,
                                                Pageable pageable);

    // Sent pending requests (I sent to someone)
    Page<Friendship> findByRequesterIdAndStatus(Long requesterId,
                                                Friendship.Status status,
                                                Pageable pageable);

    // Accepted friends list
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :userId OR f.addressee.id = :userId) " +
           "AND f.status = 'ACCEPTED'")
    Page<Friendship> findFriendsOf(@Param("userId") Long userId, Pageable pageable);

    // All accepted friends IDs for suggestions exclusion
    @Query("SELECT CASE WHEN f.requester.id = :userId THEN f.addressee.id ELSE f.requester.id END " +
           "FROM Friendship f WHERE (f.requester.id = :userId OR f.addressee.id = :userId) " +
           "AND f.status = 'ACCEPTED'")
    List<Long> findFriendIds(@Param("userId") Long userId);

    // Count mutual friends
    @Query("SELECT COUNT(DISTINCT CASE WHEN f1.requester.id = :userId1 THEN f1.addressee.id ELSE f1.requester.id END) " +
           "FROM Friendship f1, Friendship f2 WHERE f1.status = 'ACCEPTED' AND f2.status = 'ACCEPTED' " +
           "AND (f1.requester.id = :userId1 OR f1.addressee.id = :userId1) " +
           "AND (f2.requester.id = :userId2 OR f2.addressee.id = :userId2) " +
           "AND (CASE WHEN f1.requester.id = :userId1 THEN f1.addressee.id ELSE f1.requester.id END) = " +
           "(CASE WHEN f2.requester.id = :userId2 THEN f2.addressee.id ELSE f2.requester.id END)")
    long countMutualFriends(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    boolean existsByRequesterIdAndAddresseeIdAndStatus(Long requesterId, Long addresseeId, Friendship.Status status);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f " +
           "WHERE f.status = :status AND " +
           "((f.requester.id = :userId1 AND f.addressee.id = :userId2) OR " +
           "(f.requester.id = :userId2 AND f.addressee.id = :userId1))")
    boolean existsFriendshipBetween(@Param("userId1") Long userId1,
                                    @Param("userId2") Long userId2,
                                    @Param("status") Friendship.Status status);
}
