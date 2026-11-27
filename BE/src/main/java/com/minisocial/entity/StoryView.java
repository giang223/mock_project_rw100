package com.minisocial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "story_views", uniqueConstraints =
        @UniqueConstraint(name = "uk_story_views_story_viewer", columnNames = {"story_id", "viewer_id"}),
        indexes = @Index(name = "idx_story_views_viewer_time", columnList = "viewer_id,viewed_at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoryView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_id", nullable = false)
    private User viewer;

    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;
}
