package com.minisocial.service;

import com.minisocial.dto.response.AdminActivityMetricResponse;
import com.minisocial.dto.response.AdminDashboardResponse;
import com.minisocial.exception.AppException;
import com.minisocial.repository.AdminDashboardRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final AdminDashboardRepository adminDashboardRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ReportRepository reportRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard(LocalDate from, LocalDate to, Granularity granularity) {
        LocalDate effectiveTo = to == null ? LocalDate.now() : to;
        LocalDate effectiveFrom = from == null ? effectiveTo.minusDays(29) : from;
        Granularity effectiveGranularity = granularity == null ? Granularity.DAY : granularity;

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }
        if (effectiveTo.isAfter(LocalDate.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ngày kết thúc không được ở tương lai");
        }
        if (effectiveFrom.plusDays(365).isBefore(effectiveTo)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Khoảng thống kê tối đa là 366 ngày");
        }

        List<AdminActivityMetricResponse> activity = adminDashboardRepository.findActivity(
                        effectiveFrom.atStartOfDay(), effectiveTo.plusDays(1).atStartOfDay(),
                        effectiveGranularity == Granularity.MONTH)
                .stream()
                .map(this::mapMetric)
                .toList();

        return AdminDashboardResponse.builder()
                .from(effectiveFrom)
                .to(effectiveTo)
                .granularity(effectiveGranularity.name())
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByIsActiveTrue())
                .totalPosts(postRepository.countByIsDeletedFalse())
                .pendingReports(reportRepository.countByStatus(com.minisocial.entity.Report.Status.PENDING))
                .activity(activity)
                .build();
    }

    private AdminActivityMetricResponse mapMetric(Object[] row) {
        return AdminActivityMetricResponse.builder()
                .period(String.valueOf(row[0]))
                .newUsers(number(row[1]))
                .newPosts(number(row[2]))
                .shares(number(row[3]))
                .likes(number(row[4]))
                .comments(number(row[5]))
                .build();
    }

    private long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    public enum Granularity {
        DAY, MONTH
    }
}
