package com.minisocial.repository;

import com.minisocial.entity.Post;
import com.minisocial.entity.Friendship;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.author.isActive = true " +
           "AND p.author.isEmailVerified = true " +
           "AND (p.author.id = :currentUserId OR p.visibility = :publicVisibility OR " +
           "(p.visibility = :friendsVisibility AND EXISTS (SELECT f FROM Friendship f " +
           "WHERE f.status = :acceptedStatus AND " +
           "((f.requester.id = p.author.id AND f.addressee.id = :currentUserId) OR " +
           "(f.requester.id = :currentUserId AND f.addressee.id = p.author.id))))) " +
           "AND (p.author.id = :currentUserId OR p.author.isPrivate = false OR EXISTS (SELECT af FROM Follow af " +
           "WHERE af.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
           "AND af.follower.id = :currentUserId AND af.followee.id = p.author.id)) " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :currentUserId AND b.blocked.id = p.author.id) OR " +
           "(b.blocker.id = p.author.id AND b.blocked.id = :currentUserId)) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findFeedVisibleToUser(@Param("currentUserId") Long currentUserId,
                                     @Param("publicVisibility") Post.Visibility publicVisibility,
                                     @Param("friendsVisibility") Post.Visibility friendsVisibility,
                                     @Param("acceptedStatus") Friendship.Status acceptedStatus,
                                     Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.author.id = :authorId AND p.isDeleted = false " +
           "AND p.author.isActive = true AND p.author.isEmailVerified = true " +
           "AND (p.author.id = :currentUserId OR p.visibility = :publicVisibility OR " +
           "(p.visibility = :friendsVisibility AND EXISTS (SELECT f FROM Friendship f " +
           "WHERE f.status = :acceptedStatus AND " +
           "((f.requester.id = p.author.id AND f.addressee.id = :currentUserId) OR " +
           "(f.requester.id = :currentUserId AND f.addressee.id = p.author.id))))) " +
           "AND (p.author.id = :currentUserId OR p.author.isPrivate = false OR EXISTS (SELECT af FROM Follow af " +
           "WHERE af.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
           "AND af.follower.id = :currentUserId AND af.followee.id = p.author.id)) " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :currentUserId AND b.blocked.id = p.author.id) OR " +
           "(b.blocker.id = p.author.id AND b.blocked.id = :currentUserId)) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findVisibleByAuthorId(@Param("authorId") Long authorId,
                                     @Param("currentUserId") Long currentUserId,
                                     @Param("publicVisibility") Post.Visibility publicVisibility,
                                     @Param("friendsVisibility") Post.Visibility friendsVisibility,
                                     @Param("acceptedStatus") Friendship.Status acceptedStatus,
                                     Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.author.isActive = true " +
           "AND p.author.isEmailVerified = true " +
           "AND EXISTS (SELECT ph FROM PostHashtag ph WHERE ph.post.id = p.id AND ph.hashtag.name = :hashtag) " +
           "AND (p.author.id = :currentUserId OR p.visibility = :publicVisibility OR " +
           "(p.visibility = :friendsVisibility AND EXISTS (SELECT f FROM Friendship f " +
           "WHERE f.status = :acceptedStatus AND " +
           "((f.requester.id = p.author.id AND f.addressee.id = :currentUserId) OR " +
           "(f.requester.id = :currentUserId AND f.addressee.id = p.author.id))))) " +
           "AND (p.author.id = :currentUserId OR p.author.isPrivate = false OR EXISTS (SELECT af FROM Follow af " +
           "WHERE af.status = com.minisocial.entity.Follow.Status.ACCEPTED " +
           "AND af.follower.id = :currentUserId AND af.followee.id = p.author.id)) " +
           "AND NOT EXISTS (SELECT b FROM UserBlock b WHERE " +
           "(b.blocker.id = :currentUserId AND b.blocked.id = p.author.id) OR " +
           "(b.blocker.id = p.author.id AND b.blocked.id = :currentUserId)) " +
           "ORDER BY p.createdAt DESC")
    Page<Post> findVisibleByHashtag(@Param("hashtag") String hashtag,
                                    @Param("currentUserId") Long currentUserId,
                                    @Param("publicVisibility") Post.Visibility publicVisibility,
                                    @Param("friendsVisibility") Post.Visibility friendsVisibility,
                                    @Param("acceptedStatus") Friendship.Status acceptedStatus,
                                    Pageable pageable);

    Optional<Post> findByIdAndIsDeletedFalse(Long id);

    long countByIsDeletedFalse();

    @Query("SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = :postId")
    long countLikesByPostId(@Param("postId") Long postId);

    @Query("SELECT COUNT(c) FROM Comment c WHERE c.post.id = :postId AND c.isDeleted = false " +
           "AND c.author.isActive = true AND c.author.isEmailVerified = true")
    long countCommentsByPostId(@Param("postId") Long postId);
}
