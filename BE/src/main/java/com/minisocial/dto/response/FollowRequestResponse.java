package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FollowRequestResponse {
    private UserSummaryResponse requester;
    private LocalDateTime requestedAt;
}
