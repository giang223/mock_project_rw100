package com.minisocial.service;

import com.minisocial.dto.request.AdminUserActionRequest;
import com.minisocial.dto.response.AdminAuditLogResponse;
import com.minisocial.dto.response.AdminUserResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.entity.AdminAuditLog;
import com.minisocial.entity.Notification;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.AdminAuditLogRepository;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getUsers(String query, User.Role role, Boolean active, Pageable pageable) {
        String keyword = query == null || query.isBlank() ? null : query.trim();
        return userRepository.searchForAdmin(keyword, role, active, pageable).map(this::mapUser);
    }

    @Transactional
    public AdminUserResponse suspend(Long targetId, AdminUserActionRequest request) {
        User actor = securityUtils.getCurrentUser();
        User target = findManageableUser(actor, targetId);
        if (Boolean.TRUE.equals(target.getIsActive())) {
            target.setIsActive(false);
            userRepository.save(target);
            refreshTokenRepository.revokeActiveSessionsByUserId(targetId, java.time.LocalDateTime.now());
            record(actor, target, "SUSPENDED", normalizeReason(request));
        }
        return mapUser(target);
    }

    @Transactional
    public AdminUserResponse activate(Long targetId, AdminUserActionRequest request) {
        User actor = securityUtils.getCurrentUser();
        User target = findManageableUser(actor, targetId);
        if (!Boolean.TRUE.equals(target.getIsActive())) {
            target.setIsActive(true);
            userRepository.save(target);
            record(actor, target, "ACTIVATED", normalizeReason(request));
        }
        return mapUser(target);
    }

    @Transactional
    public AdminAuditLogResponse warn(Long targetId, AdminUserActionRequest request) {
        User actor = securityUtils.getCurrentUser();
        User target = findManageableUser(actor, targetId);
        if (!Boolean.TRUE.equals(target.getIsActive())) {
            throw new AppException(HttpStatus.CONFLICT, "Không thể gửi cảnh báo cho tài khoản đang bị khóa");
        }
        String reason = normalizeReason(request);
        notificationService.createNotification(target, actor, Notification.Type.ADMIN_WARNING, null,
                "Cảnh báo từ quản trị viên: " + reason);
        return mapAudit(record(actor, target, "WARNED", reason));
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLogResponse> getAuditLogs(Pageable pageable) {
        return getAuditLogs(null, null, null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLogResponse> getAuditLogs(Long actorId,
                                                    Long targetUserId,
                                                    String action,
                                                    LocalDate from,
                                                    LocalDate to,
                                                    Pageable pageable) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }
        if (from != null && to != null && ChronoUnit.DAYS.between(from, to) > 366) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Khoảng thời gian tối đa là 366 ngày");
        }
        if (to != null && to.equals(LocalDate.MAX)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ngày kết thúc không hợp lệ");
        }
        String normalizedAction = action == null || action.isBlank()
                ? null : action.trim().toUpperCase(Locale.ROOT);
        if (normalizedAction != null && normalizedAction.length() > 32) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tên hành động tối đa 32 ký tự");
        }
        LocalDateTime startAt = from == null ? null : from.atStartOfDay();
        LocalDateTime endBefore = to == null ? null : to.plusDays(1).atStartOfDay();
        return adminAuditLogRepository.search(actorId, targetUserId, normalizedAction,
                startAt, endBefore, pageable).map(this::mapAudit);
    }

    private User findManageableUser(User actor, Long targetId) {
        User target = userRepository.findLockedById(targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (actor.getId().equals(targetId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể thực hiện thao tác này với tài khoản hiện tại");
        }
        if (target.getRole() == User.Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không thể quản lý tài khoản quản trị viên khác");
        }
        return target;
    }

    private String normalizeReason(AdminUserActionRequest request) {
        return request.getReason().trim();
    }

    private AdminAuditLog record(User actor, User target, String action, String reason) {
        return adminAuditLogRepository.save(AdminAuditLog.builder()
                .actor(actor)
                .targetUser(target)
                .action(action)
                .reason(reason)
                .build());
    }

    private AdminUserResponse mapUser(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .isEmailVerified(user.getIsEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AdminAuditLogResponse mapAudit(AdminAuditLog log) {
        return AdminAuditLogResponse.builder()
                .id(log.getId())
                .actor(mapSummary(log.getActor()))
                .targetUser(mapSummary(log.getTargetUser()))
                .action(log.getAction())
                .reason(log.getReason())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private UserSummaryResponse mapSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
