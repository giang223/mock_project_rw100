package com.minisocial.service;

import com.minisocial.dto.request.ReportPostRequest;
import com.minisocial.entity.Comment;
import com.minisocial.entity.Post;
import com.minisocial.entity.Report;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.CommentRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private PostRepository postRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;
    @Mock private PostService postService;
    @Mock private ReportRepository reportRepository;
    @InjectMocks private CommentService commentService;

    @Test
    void reportsVisibleCommentAgainstItsCommentTarget() {
        User reporter = user(1L);
        Post post = Post.builder().id(10L).author(user(2L)).build();
        Comment comment = Comment.builder().id(20L).post(post).author(user(3L)).content("target").build();
        when(securityUtils.getCurrentUser()).thenReturn(reporter);
        when(postRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(post));
        doNothing().when(postService).ensureVisibleTo(post, reporter.getId());
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(
                20L, 10L)).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterId(20L, reporter.getId())).thenReturn(false);
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ReportPostRequest request = new ReportPostRequest();
        request.setReason("  harassment  ");

        commentService.reportComment(10L, 20L, request);

        ArgumentCaptor<Report> report = ArgumentCaptor.forClass(Report.class);
        verify(reportRepository).save(report.capture());
        assertEquals(comment, report.getValue().getComment());
        assertEquals(null, report.getValue().getPost());
        assertEquals("harassment", report.getValue().getReason());
        assertEquals(Report.Status.PENDING, report.getValue().getStatus());
    }

    @Test
    void preventsDuplicateCommentReportsBySameUser() {
        User reporter = user(1L);
        Post post = Post.builder().id(10L).author(user(2L)).build();
        Comment comment = Comment.builder().id(20L).post(post).author(user(3L)).content("target").build();
        when(securityUtils.getCurrentUser()).thenReturn(reporter);
        when(postRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(post));
        doNothing().when(postService).ensureVisibleTo(post, reporter.getId());
        when(commentRepository.findByIdAndPostIdAndIsDeletedFalseAndAuthorIsActiveTrueAndAuthorIsEmailVerifiedTrue(
                20L, 10L)).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterId(20L, reporter.getId())).thenReturn(true);
        ReportPostRequest request = new ReportPostRequest();
        request.setReason("abuse");

        assertThrows(AppException.class, () -> commentService.reportComment(10L, 20L, request));
    }

    private User user(Long id) {
        return User.builder().id(id).email("user" + id + "@example.com").fullName("User " + id)
                .role(User.Role.USER).isActive(true).isEmailVerified(true).build();
    }
}
