package com.minisocial.service;

import com.minisocial.dto.response.NotificationResponse;
import com.minisocial.entity.Notification;
import com.minisocial.entity.NotificationPreference;
import com.minisocial.entity.Post;
import com.minisocial.entity.User;
import com.minisocial.dto.request.UpdateNotificationPreferencesRequest;
import com.minisocial.dto.response.NotificationPreferencesResponse;
import com.minisocial.exception.AppException;
import com.minisocial.repository.NotificationPreferenceRepository;
import com.minisocial.repository.NotificationRepository;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final SecurityUtils securityUtils;

    @Transactional
    public void createNotification(User recipient, User sender,
                                   Notification.Type type, Post post, String message) {
        NotificationPreference preferences = preferenceRepository.findByUserId(recipient.getId()).orElse(null);
        if (preferences != null && !isEnabled(preferences, type)) {
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .sender(sender)
                .type(type)
                .post(post)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getPreferences() {
        Long userId = securityUtils.getCurrentUserId();
        return preferenceRepository.findByUserId(userId)
                .map(this::toPreferencesResponse)
                .orElseGet(() -> NotificationPreferencesResponse.builder()
                        .socialEnabled(true)
                        .messagesEnabled(true)
                        .build());
    }

    @Transactional
    public NotificationPreferencesResponse updatePreferences(UpdateNotificationPreferencesRequest request) {
        Long userId = securityUtils.getCurrentUserId();
        preferenceRepository.upsert(userId, request.getSocialEnabled(), request.getMessagesEnabled());
        return NotificationPreferencesResponse.builder()
                .socialEnabled(request.getSocialEnabled())
                .messagesEnabled(request.getMessagesEnabled())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(currentUserId, pageable)
                .map(this::mapToResponse);
    }

    public long getUnreadCount() {
        Long currentUserId = securityUtils.getCurrentUserId();
        return notificationRepository.countByRecipientIdAndIsReadFalse(currentUserId);
    }

    @Transactional
    public void markRead(Long notificationId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại"));

        if (!notification.getRecipient().getId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead() {
        Long currentUserId = securityUtils.getCurrentUserId();
        notificationRepository.markAllReadByRecipientId(currentUserId);
    }

    @Transactional
    public void deleteNotification(Long notificationId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại"));

        if (!notification.getRecipient().getId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền");
        }

        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteAll() {
        Long currentUserId = securityUtils.getCurrentUserId();
        notificationRepository.deleteAllByRecipientId(currentUserId);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .sender(notification.getSender() != null
                        ? PostService.mapToUserSummary(notification.getSender()) : null)
                .type(notification.getType())
                .postId(notification.getPost() != null ? notification.getPost().getId() : null)
                .message(notification.getMessage())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private boolean isEnabled(NotificationPreference preferences, Notification.Type type) {
        if (type == Notification.Type.ADMIN_WARNING) {
            return true;
        }
        if (type == Notification.Type.MESSAGE) {
            return preferences.isMessagesEnabled();
        }
        return preferences.isSocialEnabled();
    }

    private NotificationPreferencesResponse toPreferencesResponse(NotificationPreference preferences) {
        return NotificationPreferencesResponse.builder()
                .socialEnabled(preferences.isSocialEnabled())
                .messagesEnabled(preferences.isMessagesEnabled())
                .build();
    }
}
