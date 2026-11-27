package com.minisocial.repository;

import com.minisocial.entity.PostSave;
import com.minisocial.entity.Post;
import com.minisocial.entity.Friendship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostSaveRepository extends JpaRepository<PostSave, Long> {

    Optional<PostSave> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    @Query("SELECT ps FROM PostSave ps WHERE ps.user.id = :userId AND ps.post.isDeleted = false " +
           "AND ps.post.author.isActive = true AND ps.post.author.isEmailVerified = true " +
           "AND (ps.post.author.id = :userId OR ps.post.visibility = :publicVisibility OR " +
           "(ps.post.visibility = :friendsVisibility AND EXISTS (SELECT f FROM Friendship f " +
           "WHERE f.status = :acceptedStatus AND " +
           "((f.requester.id = ps.post.author.id AND f.addressee.id = :userId) OR " +
           "(f.requester.id = :userId AND f.addressee.id = ps.post.author.id))))) " +
           "AND (ps.post.author.id = :userId OR ps.post.author.isPrivate = false OR EXISTS (SELECT af FROM Follow af " +
           "WHERE af.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
           "AND af.follower.id = :userId AND af.followee.id = ps.post.author.id)) " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :userId AND b.blocked.id = ps.post.author.id) OR " +
           "(b.blocker.id = ps.post.author.id AND b.blocked.id = :userId)) " +
           "ORDER BY ps.createdAt DESC")
    Page<PostSave> findVisibleByUserId(@Param("userId") Long userId,
                                       @Param("publicVisibility") Post.Visibility publicVisibility,
                                       @Param("friendsVisibility") Post.Visibility friendsVisibility,
                                       @Param("acceptedStatus") Friendship.Status acceptedStatus,
                                       Pageable pageable);
}
