package com.minisocial.dto.response;

import com.minisocial.entity.Notification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private UserSummaryResponse sender;
    private Notification.Type type;
    private Long postId;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
