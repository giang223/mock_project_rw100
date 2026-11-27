package com.minisocial.dto.response;

import com.minisocial.entity.Report;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportResponse {
    private Long id;
    private Long postId;
    private Long commentId;
    private String targetType;
    private Long targetId;
    private String commentContent;
    private UserSummaryResponse commentAuthor;
    private String postContent;
    private String postImageUrl;
    private UserSummaryResponse postAuthor;
    private UserSummaryResponse reporter;
    private String reason;
    private Report.Status status;
    private LocalDateTime createdAt;
    private UserSummaryResponse assignedTo;
    private LocalDateTime assignedAt;
    private UserSummaryResponse reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNote;
}
