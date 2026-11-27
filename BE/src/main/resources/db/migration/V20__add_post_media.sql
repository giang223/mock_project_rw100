CREATE TABLE post_media (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    position INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_post_media_post_position UNIQUE (post_id, position),
    CONSTRAINT chk_post_media_type CHECK (media_type IN ('IMAGE', 'VIDEO')),
    CONSTRAINT chk_post_media_position CHECK (position >= 0),
    CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO post_media (post_id, media_url, media_type, position, created_at)
SELECT id, image_url, 'IMAGE', 0, COALESCE(created_at, CURRENT_TIMESTAMP(6))
FROM posts
WHERE image_url IS NOT NULL AND TRIM(image_url) <> '';
