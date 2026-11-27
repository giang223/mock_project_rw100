package com.minisocial.service;

import com.minisocial.entity.Report;
import com.minisocial.exception.AppException;
import com.minisocial.repository.AdminDashboardRepository;
import com.minisocial.repository.PostRepository;
import com.minisocial.repository.ReportRepository;
import com.minisocial.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock private AdminDashboardRepository adminDashboardRepository;
    @Mock private UserRepository userRepository;
    @Mock private PostRepository postRepository;
    @Mock private ReportRepository reportRepository;

    @InjectMocks private AdminDashboardService dashboardService;

    @Test
    void dailyDashboardReturnsCountsAndMapsAggregatedActivity() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 1, 2);
        when(adminDashboardRepository.findActivity(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), false))
                .thenReturn(List.<Object[]>of(new Object[]{"2026-01-01", 4L, 3L, 1L, 8L, 5L}));
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.countByIsActiveTrue()).thenReturn(80L);
        when(postRepository.countByIsDeletedFalse()).thenReturn(70L);
        when(reportRepository.countByStatus(Report.Status.PENDING)).thenReturn(6L);

        var response = dashboardService.getDashboard(from, to, AdminDashboardService.Granularity.DAY);

        assertEquals(100L, response.getTotalUsers());
        assertEquals(80L, response.getActiveUsers());
        assertEquals(70L, response.getTotalPosts());
        assertEquals(6L, response.getPendingReports());
        assertEquals("DAY", response.getGranularity());
        assertEquals("2026-01-01", response.getActivity().getFirst().getPeriod());
        assertEquals(8L, response.getActivity().getFirst().getLikes());
    }

    @Test
    void monthlyDashboardUsesYearMonthAggregation() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 2, 28);
        when(adminDashboardRepository.findActivity(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), true))
                .thenReturn(List.<Object[]>of(new Object[]{"2026-01", 10L, 12L, 2L, 40L, 22L}));
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.countByIsActiveTrue()).thenReturn(80L);
        when(postRepository.countByIsDeletedFalse()).thenReturn(70L);
        when(reportRepository.countByStatus(Report.Status.PENDING)).thenReturn(6L);

        var response = dashboardService.getDashboard(from, to, AdminDashboardService.Granularity.MONTH);

        assertEquals("MONTH", response.getGranularity());
        assertEquals("2026-01", response.getActivity().getFirst().getPeriod());
        verify(adminDashboardRepository).findActivity(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), true);
    }

    @Test
    void invalidAndExcessiveDateRangesAreRejectedBeforeQueries() {
        assertThrows(AppException.class, () -> dashboardService.getDashboard(
                LocalDate.of(2026, 2, 2), LocalDate.of(2026, 2, 1), AdminDashboardService.Granularity.DAY));
        assertThrows(AppException.class, () -> dashboardService.getDashboard(
                LocalDate.of(2025, 1, 1), LocalDate.of(2026, 1, 2), AdminDashboardService.Granularity.DAY));
        verifyNoInteractions(adminDashboardRepository, userRepository, postRepository, reportRepository);
    }
}
