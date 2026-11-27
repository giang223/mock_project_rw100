package com.minisocial.controller;

import com.minisocial.dto.request.AdminUserActionRequest;
import com.minisocial.dto.response.AdminAuditLogResponse;
import com.minisocial.dto.response.AdminDashboardResponse;
import com.minisocial.dto.response.AdminUserResponse;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.entity.User;
import com.minisocial.service.AdminDashboardService;
import com.minisocial.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final AdminDashboardService adminDashboardService;

    @GetMapping("/dashboard")
    public ApiResponse<AdminDashboardResponse> dashboard(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) AdminDashboardService.Granularity granularity) {
        return ApiResponse.success(adminDashboardService.getDashboard(from, to, granularity));
    }

    @GetMapping("/users")
    public ApiResponse<Page<AdminUserResponse>> getUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) User.Role role,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(adminUserService.getUsers(q, role, active, pageable));
    }

    @PostMapping("/users/{userId}/suspend")
    public ApiResponse<AdminUserResponse> suspend(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserActionRequest request) {
        return ApiResponse.success("Đã khóa tài khoản", adminUserService.suspend(userId, request));
    }

    @PostMapping("/users/{userId}/activate")
    public ApiResponse<AdminUserResponse> activate(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserActionRequest request) {
        return ApiResponse.success("Đã mở khóa tài khoản", adminUserService.activate(userId, request));
    }

    @PostMapping("/users/{userId}/warnings")
    public ApiResponse<AdminAuditLogResponse> warn(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserActionRequest request) {
        return ApiResponse.success("Đã gửi cảnh báo", adminUserService.warn(userId, request));
    }

    @GetMapping("/audit-logs")
    public ApiResponse<Page<AdminAuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) Long targetUserId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(adminUserService.getAuditLogs(
                actorId, targetUserId, action, from, to, pageable));
    }
}
