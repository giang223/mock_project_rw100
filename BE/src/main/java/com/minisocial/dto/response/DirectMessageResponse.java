package com.minisocial.dto.response;

import com.minisocial.entity.DirectMessage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class DirectMessageResponse {
    private Long id;
    private Long conversationId;
    private UserSummaryResponse sender;
    private String content;
    private String mediaUrl;
    private DirectMessage.MediaType mediaType;
    private DirectMessageReplyResponse replyTo;
    private Map<com.minisocial.entity.DirectMessageReaction.Type, Long> reactionCounts;
    private com.minisocial.entity.DirectMessageReaction.Type currentUserReaction;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
