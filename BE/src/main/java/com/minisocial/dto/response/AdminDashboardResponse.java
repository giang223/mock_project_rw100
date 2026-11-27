package com.minisocial.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class AdminDashboardResponse {
    private LocalDate from;
    private LocalDate to;
    private String granularity;
    private long totalUsers;
    private long activeUsers;
    private long totalPosts;
    private long pendingReports;
    private List<AdminActivityMetricResponse> activity;
}
