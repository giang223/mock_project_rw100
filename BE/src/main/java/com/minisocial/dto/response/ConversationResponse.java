package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConversationResponse {
    private Long id;
    private UserSummaryResponse otherParticipant;
    private String otherParticipantNickname;
    private DirectMessageSummaryResponse lastMessage;
    private long unreadCount;
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;
}
