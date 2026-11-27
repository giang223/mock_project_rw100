package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminAuditLogResponse {
    private Long id;
    private UserSummaryResponse actor;
    private UserSummaryResponse targetUser;
    private String action;
    private String reason;
    private LocalDateTime createdAt;
}
