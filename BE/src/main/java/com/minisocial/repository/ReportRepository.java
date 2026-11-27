package com.minisocial.repository;

import com.minisocial.entity.Report;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT report FROM Report report WHERE report.id = :reportId")
    Optional<Report> findLockedById(@Param("reportId") Long reportId);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findByStatusOrderByCreatedAtDesc(Report.Status status, Pageable pageable);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findByAssignedTo_IdOrderByCreatedAtDesc(Long assigneeId, Pageable pageable);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findByAssignedTo_IdAndStatusOrderByCreatedAtDesc(
            Long assigneeId, Report.Status status, Pageable pageable);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findByAssignedToIsNullOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findByAssignedToIsNullAndStatusOrderByCreatedAtDesc(
            Report.Status status, Pageable pageable);

    @EntityGraph(attributePaths = {"post.author", "comment.author", "reporter", "assignedTo", "reviewedBy"})
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(Report.Status status);

    boolean existsByPostIdAndReporterId(Long postId, Long reporterId);

    boolean existsByCommentIdAndReporterId(Long commentId, Long reporterId);

    Optional<Report> findByPostIdAndReporterId(Long postId, Long reporterId);

    List<Report> findByPostId(Long postId);

    List<Report> findByCommentId(Long commentId);
}
