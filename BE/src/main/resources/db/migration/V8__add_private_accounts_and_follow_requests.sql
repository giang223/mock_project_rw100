ALTER TABLE users
    ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE follows
    ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'ACCEPTED';

ALTER TABLE follows
    DROP INDEX idx_follows_followee_created,
    DROP INDEX idx_follows_follower_created,
    ADD INDEX idx_follows_followee_status_created (followee_id, status, created_at),
    ADD INDEX idx_follows_follower_status_created (follower_id, status, created_at);

ALTER TABLE notifications
    MODIFY COLUMN type VARCHAR(32) NOT NULL;
