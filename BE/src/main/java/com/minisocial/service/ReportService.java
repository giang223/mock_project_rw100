package com.minisocial.service;

import com.minisocial.dto.response.ReportResponse;
import com.minisocial.entity.AdminAuditLog;
import com.minisocial.entity.Comment;
import com.minisocial.entity.Report;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.CommentRepository;
import com.minisocial.repository.AdminAuditLogRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public Page<ReportResponse> getAllReports(String status, Long assigneeId,
                                              boolean unassigned, Pageable pageable) {
        Report.Status reportStatus = parseStatus(status);
        if (unassigned && assigneeId != null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Không thể lọc theo assigneeId và unassigned cùng lúc");
        }
        if (unassigned && reportStatus != null) {
            return reportRepository.findByAssignedToIsNullAndStatusOrderByCreatedAtDesc(
                    reportStatus, pageable).map(this::mapToResponse);
        }
        if (unassigned) {
            return reportRepository.findByAssignedToIsNullOrderByCreatedAtDesc(pageable)
                    .map(this::mapToResponse);
        }
        if (assigneeId != null && reportStatus != null) {
            return reportRepository.findByAssignedTo_IdAndStatusOrderByCreatedAtDesc(
                    assigneeId, reportStatus, pageable).map(this::mapToResponse);
        }
        if (assigneeId != null) {
            return reportRepository.findByAssignedTo_IdOrderByCreatedAtDesc(assigneeId, pageable)
                    .map(this::mapToResponse);
        }
        if (reportStatus != null) {
            return reportRepository.findByStatusOrderByCreatedAtDesc(reportStatus, pageable)
                    .map(this::mapToResponse);
        }
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public ReportResponse assignReport(Long reportId, Long assigneeAdminId) {
        Report report = getReport(reportId);
        if (report.getStatus() != Report.Status.PENDING) {
            throw new AppException(HttpStatus.CONFLICT, "Chỉ có thể giao báo cáo đang chờ xử lý");
        }

        User previousAssignee = report.getAssignedTo();
        if (assigneeAdminId == null) {
            if (previousAssignee == null) {
                return mapToResponse(report);
            }
            report.setAssignedTo(null);
            report.setAssignedAt(null);
            recordAdminAction(report, "REPORT_UNASSIGNED",
                    "Report " + report.getId() + " unassigned from admin " + previousAssignee.getId());
            return mapToResponse(reportRepository.save(report));
        }

        User assignee = userRepository.findLockedById(assigneeAdminId)
                .filter(user -> user.getRole() == User.Role.ADMIN && Boolean.TRUE.equals(user.getIsActive()))
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST,
                        "Người được giao phải là tài khoản quản trị đang hoạt động"));
        if (assignee.getId().equals(previousAssignee == null ? null : previousAssignee.getId())) {
            return mapToResponse(report);
        }

        boolean reassignment = previousAssignee != null;
        report.setAssignedTo(assignee);
        report.setAssignedAt(LocalDateTime.now());
        recordAdminAction(report, reassignment ? "REPORT_REASSIGNED" : "REPORT_ASSIGNED",
                "Report " + report.getId() + " assigned to admin " + assignee.getId());
        return mapToResponse(reportRepository.save(report));
    }

    private Report.Status parseStatus(String status) {
        if (status != null && !status.isBlank()) {
            try {
                return Report.Status.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Trạng thái báo cáo không hợp lệ");
            }
        }
        return null;
    }

    @Transactional
    public ReportResponse resolveReport(Long reportId, String note) {
        Report report = getReport(reportId);
        review(report, Report.Status.RESOLVED, note);
        return mapToResponse(reportRepository.save(report));
    }

    @Transactional
    public ReportResponse dismissReport(Long reportId, String note) {
        Report report = getReport(reportId);
        review(report, Report.Status.DISMISSED, note);
        return mapToResponse(reportRepository.save(report));
    }

    @Transactional
    public void deleteReport(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Báo cáo không tồn tại"));
        recordAdminAction(report, "REPORT_DELETED", "Báo cáo bị xóa khỏi hàng đợi quản trị");
        reportRepository.delete(report);
    }

    @Transactional
    public void deleteViolatingPost(Long postId) {
        var post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        post.setIsDeleted(true);
        recordAdminAction(post.getAuthor(), "POST_REMOVED", "Bài viết " + postId + " bị gỡ sau kiểm duyệt");
        commentRepository.findByPostId(postId).forEach(comment -> {
            comment.setIsDeleted(true);
            resolvePendingCommentReports(comment.getId());
        });
        reportRepository.findByPostId(postId).stream()
                .filter(report -> report.getStatus() == Report.Status.PENDING)
                .forEach(report -> review(report, Report.Status.RESOLVED, "Bài viết đã bị gỡ"));
    }

    @Transactional
    public void deleteViolatingComment(Long commentId) {
        Comment comment = commentRepository.findByIdAndIsDeletedFalse(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bình luận không tồn tại"));
        List<Comment> affectedComments = new ArrayList<>();
        affectedComments.add(comment);
        if (comment.getParentComment() == null) {
            affectedComments.addAll(commentRepository.findByParentCommentId(commentId));
        }
        affectedComments.forEach(affected -> affected.setIsDeleted(true));
        recordAdminAction(comment.getAuthor(), "COMMENT_REMOVED", "Bình luận " + commentId + " bị gỡ sau kiểm duyệt");
        affectedComments.forEach(affected -> resolvePendingCommentReports(affected.getId()));
    }

    private ReportResponse mapToResponse(Report report) {
        boolean commentTarget = report.getComment() != null;
        User targetAuthor = commentTarget
                ? report.getComment().getAuthor()
                : report.getPost().getAuthor();
        return ReportResponse.builder()
                .id(report.getId())
                .postId(report.getPost() == null ? null : report.getPost().getId())
                .commentId(commentTarget ? report.getComment().getId() : null)
                .targetType(commentTarget ? "COMMENT" : "POST")
                .targetId(commentTarget ? report.getComment().getId() : report.getPost().getId())
                .postContent(report.getPost() == null ? null : report.getPost().getContent())
                .postImageUrl(report.getPost() == null ? null : report.getPost().getImageUrl())
                .commentContent(commentTarget ? report.getComment().getContent() : null)
                .commentAuthor(commentTarget ? PostService.mapToUserSummary(targetAuthor) : null)
                .postAuthor(report.getPost() == null ? null : PostService.mapToUserSummary(targetAuthor))
                .reporter(PostService.mapToUserSummary(report.getReporter()))
                .reason(report.getReason())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .assignedTo(report.getAssignedTo() == null
                        ? null : PostService.mapToUserSummary(report.getAssignedTo()))
                .assignedAt(report.getAssignedAt())
                .reviewedBy(report.getReviewedBy() == null ? null : PostService.mapToUserSummary(report.getReviewedBy()))
                .reviewedAt(report.getReviewedAt())
                .reviewNote(report.getReviewNote())
                .build();
    }

    private Report getReport(Long reportId) {
        return reportRepository.findLockedById(reportId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Báo cáo không tồn tại"));
    }

    private void review(Report report, Report.Status status, String note) {
        if (report.getStatus() != Report.Status.PENDING) {
            throw new AppException(HttpStatus.CONFLICT, "Báo cáo này đã được xử lý");
        }
        User reviewer = securityUtils.getCurrentUser();
        report.setStatus(status);
        report.setReviewedBy(reviewer);
        report.setReviewedAt(LocalDateTime.now());
        report.setReviewNote(note == null || note.isBlank() ? null : note.trim());
        User target = report.getComment() == null
                ? report.getPost().getAuthor()
                : report.getComment().getAuthor();
        String auditReason = report.getReviewNote() == null
                ? "Report " + report.getId() + " marked " + status.name()
                : "Report " + report.getId() + ": " + report.getReviewNote();
        adminAuditLogRepository.save(AdminAuditLog.builder()
                .actor(reviewer)
                .targetUser(target)
                .action("REPORT_" + status.name())
                .reason(auditReason)
                .build());
    }

    private void recordAdminAction(Report report, String action, String reason) {
        User target = report.getComment() == null
                ? report.getPost().getAuthor()
                : report.getComment().getAuthor();
        recordAdminAction(target, action, reason);
    }

    private void recordAdminAction(User target, String action, String reason) {
        adminAuditLogRepository.save(AdminAuditLog.builder()
                .actor(securityUtils.getCurrentUser())
                .targetUser(target)
                .action(action)
                .reason(reason)
                .build());
    }

    private void resolvePendingCommentReports(Long commentId) {
        reportRepository.findByCommentId(commentId).stream()
                .filter(report -> report.getStatus() == Report.Status.PENDING)
                .forEach(report -> review(report, Report.Status.RESOLVED, "Bình luận đã bị gỡ"));
    }
}
