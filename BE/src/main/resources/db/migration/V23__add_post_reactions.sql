ALTER TABLE post_likes
    ADD COLUMN reaction_type VARCHAR(12) NOT NULL DEFAULT 'LIKE';

ALTER TABLE post_likes
    ADD CONSTRAINT chk_post_likes_reaction_type
        CHECK (reaction_type IN ('LIKE', 'LOVE', 'LAUGH', 'SURPRISED', 'SAD', 'ANGRY'));

CREATE INDEX idx_post_likes_post_reaction
    ON post_likes (post_id, reaction_type);
