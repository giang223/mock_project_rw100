package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private Long parentCommentId;
    private long replyCount;
    private UserSummaryResponse author;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
