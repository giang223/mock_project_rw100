package com.minisocial.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_audit_logs", indexes = {
        @Index(name = "idx_admin_audit_created", columnList = "created_at"),
        @Index(name = "idx_admin_audit_target_created", columnList = "target_user_id,created_at"),
        @Index(name = "idx_admin_audit_actor_created", columnList = "actor_id,created_at"),
        @Index(name = "idx_admin_audit_action_created", columnList = "action,created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    @Column(nullable = false, length = 32)
    private String action;

    @Column(length = 1000)
    private String reason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
