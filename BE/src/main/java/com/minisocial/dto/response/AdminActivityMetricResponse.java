package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminActivityMetricResponse {
    private String period;
    private long newUsers;
    private long newPosts;
    private long shares;
    private long likes;
    private long comments;
}
