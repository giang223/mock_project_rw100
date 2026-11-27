package com.minisocial.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class AdminDashboardRepository {

    private static final String ACTIVITY_SQL = """
            SELECT activity.period_label,
                   SUM(activity.users_created),
                   SUM(activity.posts_created),
                   SUM(activity.shares_created),
                   SUM(activity.likes_created),
                   SUM(activity.comments_created)
            FROM (
                SELECT CASE WHEN :monthly = 1 THEN DATE_FORMAT(u.created_at, '%Y-%m')
                            ELSE DATE_FORMAT(u.created_at, '%Y-%m-%d') END AS period_label,
                       COUNT(*) AS users_created, 0 AS posts_created, 0 AS shares_created,
                       0 AS likes_created, 0 AS comments_created
                FROM users u
                WHERE u.created_at >= :startInclusive AND u.created_at < :endExclusive
                GROUP BY period_label
                UNION ALL
                SELECT CASE WHEN :monthly = 1 THEN DATE_FORMAT(p.created_at, '%Y-%m')
                            ELSE DATE_FORMAT(p.created_at, '%Y-%m-%d') END AS period_label,
                       0, COUNT(*), SUM(CASE WHEN p.is_shared = 1 THEN 1 ELSE 0 END), 0, 0
                FROM posts p
                WHERE p.created_at >= :startInclusive AND p.created_at < :endExclusive
                  AND p.is_deleted = 0
                GROUP BY period_label
                UNION ALL
                SELECT CASE WHEN :monthly = 1 THEN DATE_FORMAT(pl.created_at, '%Y-%m')
                            ELSE DATE_FORMAT(pl.created_at, '%Y-%m-%d') END AS period_label,
                       0, 0, 0, COUNT(*), 0
                FROM post_likes pl
                WHERE pl.created_at >= :startInclusive AND pl.created_at < :endExclusive
                GROUP BY period_label
                UNION ALL
                SELECT CASE WHEN :monthly = 1 THEN DATE_FORMAT(c.created_at, '%Y-%m')
                            ELSE DATE_FORMAT(c.created_at, '%Y-%m-%d') END AS period_label,
                       0, 0, 0, 0, COUNT(*)
                FROM comments c
                WHERE c.created_at >= :startInclusive AND c.created_at < :endExclusive
                  AND c.is_deleted = 0
                GROUP BY period_label
            ) activity
            GROUP BY activity.period_label
            ORDER BY activity.period_label
            """;

    @PersistenceContext
    private EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<Object[]> findActivity(LocalDateTime startInclusive, LocalDateTime endExclusive, boolean monthly) {
        Query query = entityManager.createNativeQuery(ACTIVITY_SQL);
        query.setParameter("monthly", monthly ? 1 : 0);
        query.setParameter("startInclusive", startInclusive);
        query.setParameter("endExclusive", endExclusive);
        return query.getResultList();
    }
}
