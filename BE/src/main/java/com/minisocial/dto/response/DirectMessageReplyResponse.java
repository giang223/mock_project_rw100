package com.minisocial.dto.response;

import com.minisocial.entity.DirectMessage;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DirectMessageReplyResponse {
    private Long id;
    private UserSummaryResponse sender;
    private String content;
    private String mediaUrl;
    private DirectMessage.MediaType mediaType;
}
