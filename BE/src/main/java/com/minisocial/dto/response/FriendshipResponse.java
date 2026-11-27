package com.minisocial.dto.response;

import com.minisocial.entity.Friendship;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FriendshipResponse {
    private Long id;
    private UserSummaryResponse user;    // the other person
    private Friendship.Status status;
    private long mutualFriendCount;
    private LocalDateTime createdAt;
}
