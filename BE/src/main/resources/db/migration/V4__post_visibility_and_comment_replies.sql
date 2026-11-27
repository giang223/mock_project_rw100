ALTER TABLE posts
    ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE comments
    ADD COLUMN parent_comment_id BIGINT NULL,
    ADD INDEX idx_comments_parent_created (parent_comment_id, created_at),
    ADD CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_comment_id) REFERENCES comments (id) ON DELETE SET NULL;
