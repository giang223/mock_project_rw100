package com.minisocial.dto.response;

import com.minisocial.entity.Post;
import com.minisocial.entity.Story;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StoryResponse {
    private Long id;
    private UserSummaryResponse author;
    private String content;
    private String mediaUrl;
    private Story.MediaType mediaType;
    private Post.Visibility visibility;
    private LocalDateTime expiresAt;
    private long viewCount;
    private LocalDateTime createdAt;
}
