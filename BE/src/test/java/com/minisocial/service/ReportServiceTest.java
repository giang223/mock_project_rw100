package com.minisocial.service;

import com.minisocial.entity.Comment;
import com.minisocial.entity.AdminAuditLog;
import com.minisocial.entity.Post;
import com.minisocial.entity.Report;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.CommentRepository;
import com.minisocial.repository.AdminAuditLogRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private ReportRepository reportRepository;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private AdminAuditLogRepository adminAuditLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private SecurityUtils securityUtils;
    @InjectMocks private ReportService reportService;

    @Test
    void resolvesCommentReportAndReturnsTargetAndReviewerMetadata() {
        User reviewer = user(1L, "Admin");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("harmful comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .reason("abuse").status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        var response = reportService.resolveReport(20L, " reviewed ");

        assertEquals("COMMENT", response.getTargetType());
        assertEquals(8L, response.getTargetId());
        assertEquals("harmful comment", response.getCommentContent());
        assertEquals(Report.Status.RESOLVED, response.getStatus());
        assertEquals("reviewed", response.getReviewNote());
        assertEquals(reviewer.getId(), response.getReviewedBy().getId());
        assertNotNull(response.getReviewedAt());
        org.mockito.ArgumentCaptor<AdminAuditLog> audit = org.mockito.ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository).save(audit.capture());
        assertEquals("REPORT_RESOLVED", audit.getValue().getAction());
        assertEquals(author.getId(), audit.getValue().getTargetUser().getId());
    }

    @Test
    void dismissesReportWithoutDeletingItsHistory() {
        User reviewer = user(1L, "Admin");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .reason("not a violation").status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        var response = reportService.dismissReport(20L, null);

        assertEquals(Report.Status.DISMISSED, response.getStatus());
        verify(reportRepository).save(report);
    }

    @Test
    void rejectsReviewingAlreadyClosedReport() {
        Report report = Report.builder().id(20L).status(Report.Status.DISMISSED).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));

        assertThrows(AppException.class, () -> reportService.resolveReport(20L, "again"));
        verify(reportRepository, never()).save(any(Report.class));
    }

    @Test
    void assignsPendingReportToActiveAdminAndAuditsTheChange() {
        User reviewer = user(1L, "Reviewer");
        User assignee = admin(4L, "Assignee");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .reason("abuse").status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(userRepository.findLockedById(assignee.getId())).thenReturn(Optional.of(assignee));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        var response = reportService.assignReport(20L, assignee.getId());

        assertEquals(assignee.getId(), response.getAssignedTo().getId());
        assertNotNull(response.getAssignedAt());
        org.mockito.ArgumentCaptor<AdminAuditLog> audit = org.mockito.ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository).save(audit.capture());
        assertEquals("REPORT_ASSIGNED", audit.getValue().getAction());
        assertEquals(author.getId(), audit.getValue().getTargetUser().getId());
    }

    @Test
    void rejectsAssignmentToNonAdminAccount() {
        User notAdmin = User.builder().id(4L).email("user@example.com").fullName("User")
                .role(User.Role.USER).isActive(true).build();
        Report report = Report.builder().id(20L).status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(userRepository.findLockedById(4L)).thenReturn(Optional.of(notAdmin));

        assertThrows(AppException.class, () -> reportService.assignReport(20L, 4L));

        verify(reportRepository, never()).save(any(Report.class));
        verify(adminAuditLogRepository, never()).save(any(AdminAuditLog.class));
    }

    @Test
    void canReassignPendingReportAndRecordsReassignment() {
        User reviewer = user(1L, "Reviewer");
        User firstAssignee = admin(4L, "FirstAssignee");
        User nextAssignee = admin(5L, "NextAssignee");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .assignedTo(firstAssignee).reason("abuse").status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(userRepository.findLockedById(nextAssignee.getId())).thenReturn(Optional.of(nextAssignee));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        var response = reportService.assignReport(20L, nextAssignee.getId());

        assertEquals(nextAssignee.getId(), response.getAssignedTo().getId());
        org.mockito.ArgumentCaptor<AdminAuditLog> audit = org.mockito.ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository).save(audit.capture());
        assertEquals("REPORT_REASSIGNED", audit.getValue().getAction());
    }

    @Test
    void assignmentToSameAdminIsIdempotent() {
        User assignee = admin(4L, "Assignee");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .assignedTo(assignee).status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(userRepository.findLockedById(assignee.getId())).thenReturn(Optional.of(assignee));

        var response = reportService.assignReport(20L, assignee.getId());

        assertEquals(assignee.getId(), response.getAssignedTo().getId());
        verify(reportRepository, never()).save(any(Report.class));
        verify(adminAuditLogRepository, never()).save(any(AdminAuditLog.class));
    }

    @Test
    void unassignsPendingReportToReturnItToTheSharedQueue() {
        User reviewer = user(1L, "Reviewer");
        User assignee = admin(4L, "Assignee");
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .assignedTo(assignee).assignedAt(java.time.LocalDateTime.now())
                .status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        var response = reportService.assignReport(20L, null);

        assertNull(response.getAssignedTo());
        assertNull(response.getAssignedAt());
        org.mockito.ArgumentCaptor<AdminAuditLog> audit = org.mockito.ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository).save(audit.capture());
        assertEquals("REPORT_UNASSIGNED", audit.getValue().getAction());
    }

    @Test
    void unassigningAlreadyUnassignedReportIsIdempotent() {
        User reporter = user(2L, "Reporter");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").build();
        Report report = Report.builder().id(20L).comment(comment).reporter(reporter)
                .status(Report.Status.PENDING).build();
        when(reportRepository.findLockedById(20L)).thenReturn(Optional.of(report));

        var response = reportService.assignReport(20L, null);

        assertNull(response.getAssignedTo());
        verify(reportRepository, never()).save(any(Report.class));
        verify(adminAuditLogRepository, never()).save(any(AdminAuditLog.class));
    }

    @Test
    void adminCommentRemovalSoftDeletesTargetAndClosesPendingReports() {
        User reviewer = user(1L, "Admin");
        User author = user(3L, "Author");
        Comment comment = Comment.builder().id(8L).author(author).content("comment").isDeleted(false).build();
        Report report = Report.builder().id(20L).comment(comment).status(Report.Status.PENDING).build();
        when(commentRepository.findByIdAndIsDeletedFalse(8L)).thenReturn(Optional.of(comment));
        when(commentRepository.findByParentCommentId(8L)).thenReturn(List.of());
        when(reportRepository.findByCommentId(8L)).thenReturn(List.of(report));
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        reportService.deleteViolatingComment(8L);

        assertEquals(true, comment.getIsDeleted());
        assertEquals(Report.Status.RESOLVED, report.getStatus());
        assertEquals("Bình luận đã bị gỡ", report.getReviewNote());
        verify(commentRepository).findByParentCommentId(8L);
        org.mockito.ArgumentCaptor<AdminAuditLog> audit = org.mockito.ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository, times(2)).save(audit.capture());
        assertEquals(List.of("COMMENT_REMOVED", "REPORT_RESOLVED"),
                audit.getAllValues().stream().map(AdminAuditLog::getAction).sorted().toList());
    }

    @Test
    void removingPostAlsoHidesCommentsAndResolvesTheirPendingReports() {
        User reviewer = user(1L, "Admin");
        User author = user(3L, "Author");
        User reporter = user(2L, "Reporter");
        Post post = Post.builder().id(5L).author(author).isDeleted(false).build();
        Comment comment = Comment.builder().id(8L).post(post).author(author).content("comment").isDeleted(false).build();
        Report commentReport = Report.builder().id(20L).comment(comment).reporter(reporter)
                .status(Report.Status.PENDING).build();
        when(postRepository.findByIdAndIsDeletedFalse(5L)).thenReturn(Optional.of(post));
        when(commentRepository.findByPostId(5L)).thenReturn(List.of(comment));
        when(reportRepository.findByCommentId(8L)).thenReturn(List.of(commentReport));
        when(reportRepository.findByPostId(5L)).thenReturn(List.of());
        when(securityUtils.getCurrentUser()).thenReturn(reviewer);

        reportService.deleteViolatingPost(5L);

        assertEquals(true, post.getIsDeleted());
        assertEquals(true, comment.getIsDeleted());
        assertEquals(Report.Status.RESOLVED, commentReport.getStatus());
        verify(adminAuditLogRepository, times(2)).save(any(AdminAuditLog.class));
    }

    private User user(Long id, String name) {
        return User.builder().id(id).email(name.toLowerCase() + "@example.com").fullName(name)
                .role(id == 1L ? User.Role.ADMIN : User.Role.USER).isActive(true).isEmailVerified(true).build();
    }

    private User admin(Long id, String name) {
        return User.builder().id(id).email(name.toLowerCase() + "@example.com").fullName(name)
                .role(User.Role.ADMIN).isActive(true).isEmailVerified(true).build();
    }
}
