package com.minisocial.repository;

import com.minisocial.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByPostIdAndParentCommentIsNullAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrueOrderByCreatedAtAsc(
            Long postId, Pageable pageable);

    Page<Comment> findByParentCommentIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrueOrderByCreatedAtAsc(
            Long parentCommentId, Pageable pageable);

    Optional<Comment> findByIdAndIsDeletedFalse(Long id);

    Optional<Comment> findByIdAndPostIdAndIsDeletedFalse(Long id, Long postId);

    List<Comment> findByPostId(Long postId);

    Optional<Comment> findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(
            Long id, Long postId);

    List<Comment> findByParentCommentIdAndIsDeletedFalse(Long parentCommentId);

    List<Comment> findByParentCommentId(Long parentCommentId);

    long countByParentCommentIdAndIsDeletedFalse(Long parentCommentId);

    long countByParentCommentIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(
            Long parentCommentId);
}
