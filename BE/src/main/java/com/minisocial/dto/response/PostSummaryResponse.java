package com.minisocial.dto.response;

import com.minisocial.entity.Post;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PostSummaryResponse {
    private Long id;
    private UserSummaryResponse author;
    private String content;
    private String feeling;
    private String imageUrl;
    private List<PostMediaResponse> media;
    private Post.Visibility visibility;
    private Boolean isEdited;
    private LocalDateTime createdAt;
}
