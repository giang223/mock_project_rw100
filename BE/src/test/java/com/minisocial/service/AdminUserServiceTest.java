package com.minisocial.service;

import com.minisocial.dto.request.AdminUserActionRequest;
import com.minisocial.entity.AdminAuditLog;
import com.minisocial.entity.Notification;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.AdminAuditLogRepository;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AdminAuditLogRepository adminAuditLogRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private NotificationService notificationService;
    @Mock private SecurityUtils securityUtils;

    @InjectMocks private AdminUserService adminUserService;

    @Test
    void suspendingUserRevokesSessionsAndPersistsReasonedAuditEntry() {
        User admin = user(1L, User.Role.ADMIN, true);
        User target = user(2L, User.Role.USER, true);
        AdminUserActionRequest request = action(" repeated abuse ");
        when(securityUtils.getCurrentUser()).thenReturn(admin);
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(adminAuditLogRepository.save(any(AdminAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.suspend(2L, request);

        assertFalse(target.getIsActive());
        assertFalse(response.getIsActive());
        verify(refreshTokenRepository).revokeActiveSessionsByUserId(
                org.mockito.ArgumentMatchers.eq(2L), any(java.time.LocalDateTime.class));
        ArgumentCaptor<AdminAuditLog> audit = ArgumentCaptor.forClass(AdminAuditLog.class);
        verify(adminAuditLogRepository).save(audit.capture());
        assertEquals("SUSPENDED", audit.getValue().getAction());
        assertEquals("repeated abuse", audit.getValue().getReason());
    }

    @Test
    void adminCannotSuspendSelfOrAnotherAdministrator() {
        User admin = user(1L, User.Role.ADMIN, true);
        User otherAdmin = user(2L, User.Role.ADMIN, true);
        when(securityUtils.getCurrentUser()).thenReturn(admin);
        when(userRepository.findLockedById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(otherAdmin));

        assertThrows(AppException.class, () -> adminUserService.suspend(1L, action("self")));
        assertThrows(AppException.class, () -> adminUserService.suspend(2L, action("admin")));
        verify(userRepository, never()).save(any(User.class));
        verify(adminAuditLogRepository, never()).save(any(AdminAuditLog.class));
    }

    @Test
    void activationRestoresDisabledUserAndAuditsTheReason() {
        User admin = user(1L, User.Role.ADMIN, true);
        User target = user(2L, User.Role.USER, false);
        when(securityUtils.getCurrentUser()).thenReturn(admin);
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(adminAuditLogRepository.save(any(AdminAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.activate(2L, action("review completed"));

        assertEquals(true, response.getIsActive());
        verify(adminAuditLogRepository).save(any(AdminAuditLog.class));
        verify(refreshTokenRepository, never()).revokeActiveSessionsByUserId(any(), any());
    }

    @Test
    void warningCreatesUserNotificationAndAuditLog() {
        User admin = user(1L, User.Role.ADMIN, true);
        User target = user(2L, User.Role.USER, true);
        when(securityUtils.getCurrentUser()).thenReturn(admin);
        when(userRepository.findLockedById(2L)).thenReturn(Optional.of(target));
        when(adminAuditLogRepository.save(any(AdminAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = adminUserService.warn(2L, action("follow the community rules"));

        assertEquals("WARNED", response.getAction());
        assertEquals("follow the community rules", response.getReason());
        verify(notificationService).createNotification(target, admin, Notification.Type.ADMIN_WARNING,
                null, "Cảnh báo từ quản trị viên: follow the community rules");
        verify(adminAuditLogRepository).save(any(AdminAuditLog.class));
    }

    @Test
    void auditSearchNormalizesActionAndUsesInclusiveCalendarDates() {
        LocalDate from = LocalDate.of(2026, 3, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        when(adminAuditLogRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(Page.empty());

        adminUserService.getAuditLogs(4L, 8L, " suspended ", from, to, Pageable.unpaged());

        org.mockito.ArgumentCaptor<LocalDateTime> start = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        org.mockito.ArgumentCaptor<LocalDateTime> end = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        verify(adminAuditLogRepository).search(
                org.mockito.ArgumentMatchers.eq(4L), org.mockito.ArgumentMatchers.eq(8L),
                org.mockito.ArgumentMatchers.eq("SUSPENDED"), start.capture(), end.capture(),
                org.mockito.ArgumentMatchers.any(Pageable.class));
        assertEquals(from.atStartOfDay(), start.getValue());
        assertEquals(to.plusDays(1).atStartOfDay(), end.getValue());
    }

    @Test
    void auditSearchRejectsReversedDates() {
        assertThrows(AppException.class, () -> adminUserService.getAuditLogs(
                null, null, null, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 3, 31), Pageable.unpaged()));
        verify(adminAuditLogRepository, never()).search(any(), any(), any(), any(), any(), any());
    }

    private AdminUserActionRequest action(String reason) {
        AdminUserActionRequest request = new AdminUserActionRequest();
        request.setReason(reason);
        return request;
    }

    private User user(Long id, User.Role role, boolean active) {
        return User.builder().id(id).email("user" + id + "@example.com").fullName("User " + id)
                .role(role).isActive(active).isEmailVerified(true).build();
    }
}
