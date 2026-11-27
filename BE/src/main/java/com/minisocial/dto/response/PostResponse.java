package com.minisocial.dto.response;

import com.minisocial.entity.Post;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@Data
@Builder
public class PostResponse {
    private Long id;
    private UserSummaryResponse author;
    private String content;
    private String feeling;
    private String imageUrl;
    private List<PostMediaResponse> media;
    private Post.Visibility visibility;
    private Boolean isShared;
    private Boolean isEdited;
    private PostSummaryResponse sharedFromPost;
    private long likeCount;
    private Map<String, Long> reactionCounts;
    private String currentUserReaction;
    private long commentCount;
    private boolean liked;    // has current user liked this?
    private boolean saved;    // has current user saved this?
    private List<String> hashtags;
    private List<UserSummaryResponse> mentions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
