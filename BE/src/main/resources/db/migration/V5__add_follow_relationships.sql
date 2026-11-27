CREATE TABLE follows (
    id BIGINT NOT NULL AUTO_INCREMENT,
    follower_id BIGINT NOT NULL,
    followee_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_follows_pair UNIQUE (follower_id, followee_id),
    INDEX idx_follows_followee_created (followee_id, created_at),
    INDEX idx_follows_follower_created (follower_id, created_at),
    CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_followee FOREIGN KEY (followee_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_follows_not_self CHECK (follower_id <> followee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
