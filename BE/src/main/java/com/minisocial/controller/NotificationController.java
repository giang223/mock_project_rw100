package com.minisocial.controller;

import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.NotificationResponse;
import com.minisocial.dto.request.UpdateNotificationPreferencesRequest;
import com.minisocial.dto.response.NotificationPreferencesResponse;
import com.minisocial.service.NotificationService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<Page<NotificationResponse>> getNotifications(
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(notificationService.getNotifications(pageable));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.success(Map.of("count", notificationService.getUnreadCount()));
    }

    @GetMapping("/preferences")
    public ApiResponse<NotificationPreferencesResponse> getPreferences() {
        return ApiResponse.success(notificationService.getPreferences());
    }

    @PutMapping("/preferences")
    public ApiResponse<NotificationPreferencesResponse> updatePreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        return ApiResponse.success("Đã cập nhật tùy chọn thông báo",
                notificationService.updatePreferences(request));
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ApiResponse.success("Đã đánh dấu thông báo đã đọc");
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllRead() {
        notificationService.markAllRead();
        return ApiResponse.success("Đã đánh dấu tất cả thông báo đã đọc");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        notificationService.deleteAll();
        return ResponseEntity.noContent().build();
    }
}
