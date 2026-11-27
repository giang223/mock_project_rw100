package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FollowActionResponse {
    private boolean following;
    private String status;
}
