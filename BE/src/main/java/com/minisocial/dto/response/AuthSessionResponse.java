package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuthSessionResponse {
    private String sessionId;
    private LocalDateTime lastActivityAt;
    private LocalDateTime expiresAt;
    private boolean currentSession;
}
