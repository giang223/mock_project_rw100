package com.minisocial.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "direct_message_reactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_direct_message_reactions_message_user",
                columnNames = {"direct_message_id", "user_id"})
}, indexes = {
        @Index(name = "idx_direct_message_reactions_message_type", columnList = "direct_message_id,reaction_type")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DirectMessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "direct_message_id", nullable = false)
    private DirectMessage directMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false, length = 12)
    private Type reactionType;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Type {
        LIKE, LOVE, LAUGH, SURPRISED, SAD, ANGRY
    }
}
