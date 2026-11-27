package com.minisocial.dto.response;

import com.minisocial.entity.DirectMessage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DirectMessageSummaryResponse {
    private Long id;
    private Long senderId;
    private String content;
    private String mediaUrl;
    private DirectMessage.MediaType mediaType;
    private LocalDateTime createdAt;
}
