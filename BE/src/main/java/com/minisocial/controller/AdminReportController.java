package com.minisocial.controller;

import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.ReportResponse;
import com.minisocial.dto.request.AssignReportRequest;
import com.minisocial.dto.request.ReviewReportRequest;
import com.minisocial.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reportService;

    @GetMapping
    public ApiResponse<Page<ReportResponse>> listReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "false") boolean unassigned,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(reportService.getAllReports(status, assigneeId, unassigned, pageable));
    }

    @PutMapping("/{reportId}/assignment")
    public ApiResponse<ReportResponse> assignReport(@PathVariable Long reportId,
                                                    @Valid @RequestBody AssignReportRequest request) {
        return ApiResponse.success("Đã giao báo cáo", reportService.assignReport(
                reportId, request.getAssigneeAdminId()));
    }

    @PutMapping("/{reportId}/resolve")
    public ApiResponse<ReportResponse> resolveReport(@PathVariable Long reportId,
                                                     @Valid @RequestBody(required = false) ReviewReportRequest request) {
        return ApiResponse.success("Đã xử lý báo cáo", reportService.resolveReport(
                reportId, request == null ? null : request.getNote()));
    }

    @PutMapping("/{reportId}/dismiss")
    public ApiResponse<ReportResponse> dismissReport(@PathVariable Long reportId,
                                                     @Valid @RequestBody(required = false) ReviewReportRequest request) {
        return ApiResponse.success("Đã bỏ qua báo cáo", reportService.dismissReport(
                reportId, request == null ? null : request.getNote()));
    }

    @DeleteMapping("/{reportId}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long reportId) {
        reportService.deleteReport(reportId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deleteReportedPost(@PathVariable Long postId) {
        reportService.deleteViolatingPost(postId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteReportedComment(@PathVariable Long commentId) {
        reportService.deleteViolatingComment(commentId);
        return ResponseEntity.noContent().build();
    }
}
