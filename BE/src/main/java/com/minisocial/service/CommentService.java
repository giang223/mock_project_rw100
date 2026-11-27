package com.minisocial.service;

import com.minisocial.dto.request.CreateCommentRequest;
import com.minisocial.dto.request.ReportPostRequest;
import com.minisocial.dto.response.CommentResponse;
import com.minisocial.entity.*;
import com.minisocial.exception.AppException;
import com.minisocial.repository.CommentRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;
    private final PostService postService;
    private final ReportRepository reportRepository;

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long postId, Pageable pageable) {
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        postService.ensureVisibleTo(post, securityUtils.getCurrentUserId());
        return commentRepository.findByPostIdAndParentCommentIsNullAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrueOrderByCreatedAtAsc(postId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getReplies(Long postId, Long commentId, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        postService.ensureVisibleTo(post, currentUserId);
        Comment parent = commentRepository.findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(commentId, postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));
        if (parent.getParentComment() != null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể xem trả lời của bình luận gốc");
        }
        return commentRepository.findByParentCommentIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrueOrderByCreatedAtAsc(commentId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public CommentResponse addComment(Long postId, CreateCommentRequest request) {
        User author = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        postService.ensureVisibleTo(post, author.getId());

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(
                            request.getParentCommentId(), postId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận cha không tồn tại"));
            if (parentComment.getParentComment() != null) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ trả lời trực tiếp bình luận gốc");
            }
        }

        Comment comment = Comment.builder()
                .post(post)
                .author(author)
                .parentComment(parentComment)
                .content(request.getContent().trim())
                .isDeleted(false)
                .build();
        commentRepository.save(comment);

        if (parentComment != null && !parentComment.getAuthor().getId().equals(author.getId())) {
            notificationService.createNotification(
                    parentComment.getAuthor(), author,
                    Notification.Type.COMMENT, post,
                    author.getFullName() + " đã trả lời bình luận của bạn");
        }
        if (!post.getAuthor().getId().equals(author.getId())
                && (parentComment == null || !post.getAuthor().getId().equals(parentComment.getAuthor().getId()))) {
            notificationService.createNotification(
                    post.getAuthor(), author,
                    Notification.Type.COMMENT, post,
                    author.getFullName() + " đã bình luận: " + truncate(request.getContent(), 50));
        }

        return mapToResponse(comment);
    }

    @Transactional
    public CommentResponse updateComment(Long postId, Long commentId, String content) {
        User currentUser = securityUtils.getCurrentUser();
        Comment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));

        if (!comment.getPost().getId().equals(postId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bình luận không thuộc bài viết này");
        }
        postService.ensureVisibleTo(comment.getPost(), currentUser.getId());
        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa bình luận này");
        }
        if (content == null || content.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung bình luận không được để trống");
        }

        comment.setContent(content.trim());
        commentRepository.save(comment);
        return mapToResponse(comment);
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId) {
        User currentUser = securityUtils.getCurrentUser();
        Comment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));

        if (!comment.getPost().getId().equals(postId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Bình luận không thuộc bài viết này");
        }
        postService.ensureVisibleTo(comment.getPost(), currentUser.getId());

        boolean isOwner = comment.getAuthor().getId().equals(currentUser.getId());
        boolean isPostOwner = comment.getPost().getAuthor().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == User.Role.ADMIN;

        if (!isOwner && !isPostOwner && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa bình luận này");
        }

        comment.setIsDeleted(true);
        commentRepository.save(comment);
        if (comment.getParentComment() == null) {
            commentRepository.findByParentCommentIdAndIsDeletedFalse(commentId).forEach(reply -> {
                reply.setIsDeleted(true);
                commentRepository.save(reply);
            });
        }
    }

    @Transactional
    public void reportComment(Long postId, Long commentId, ReportPostRequest request) {
        User reporter = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        postService.ensureVisibleTo(post, reporter.getId());

        Comment comment = commentRepository.findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(commentId, postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));
        if (reportRepository.existsByCommentIdAndReporterId(commentId, reporter.getId())) {
            throw new AppException(HttpStatus.CONFLICT, "Bạn đã báo cáo bình luận này rồi");
        }

        reportRepository.save(Report.builder()
                .comment(comment)
                .reporter(reporter)
                .reason(request.getReason().trim())
                .status(Report.Status.PENDING)
                .build());
    }

    private CommentResponse mapToResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() == null
                        ? null : comment.getParentComment().getId())
                .replyCount(comment.getParentComment() == null
                        ? commentRepository.countByParentCommentIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(comment.getId()) : 0)
                .author(PostService.mapToUserSummary(comment.getAuthor()))
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "..." : text;
    }

}
