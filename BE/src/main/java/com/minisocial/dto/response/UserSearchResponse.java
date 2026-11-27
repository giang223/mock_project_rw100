package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserSearchResponse {
    private Long id;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String coverUrl;
    private String bio;
    private Boolean isPrivate;
    private String followStatus; // none, pending, accepted
    private long mutualFriendCount;
    private String friendshipStatus; // none, sent, received, accepted, blocked
}
