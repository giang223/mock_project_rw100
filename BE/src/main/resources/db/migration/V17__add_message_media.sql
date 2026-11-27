ALTER TABLE direct_messages
    MODIFY COLUMN content TEXT NULL,
    ADD COLUMN media_url VARCHAR(500) NULL AFTER content,
    ADD COLUMN media_type VARCHAR(10) NULL AFTER media_url,
    ADD CONSTRAINT chk_direct_messages_content_or_media
        CHECK ((content IS NOT NULL AND CHAR_LENGTH(TRIM(content)) > 0)
            OR (media_url IS NOT NULL AND media_type IN ('IMAGE', 'VIDEO'))),
    ADD CONSTRAINT chk_direct_messages_media_pair
        CHECK ((media_url IS NULL AND media_type IS NULL)
            OR (media_url IS NOT NULL AND media_type IN ('IMAGE', 'VIDEO')));
