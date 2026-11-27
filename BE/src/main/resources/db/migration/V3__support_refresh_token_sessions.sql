-- Allow several concurrent devices while retaining rotated token hashes so reuse can be detected.
ALTER TABLE refresh_tokens
    DROP INDEX uk_refresh_tokens_user,
    ADD COLUMN session_id VARCHAR(36) NULL AFTER user_id,
    ADD COLUMN revoked_at DATETIME(6) NULL AFTER expires_at,
    ADD COLUMN replaced_by_hash VARCHAR(64) NULL AFTER revoked_at;

UPDATE refresh_tokens
SET session_id = UUID()
WHERE session_id IS NULL;

ALTER TABLE refresh_tokens
    MODIFY COLUMN session_id VARCHAR(36) NOT NULL,
    ADD INDEX idx_refresh_tokens_user_session (user_id, session_id, revoked_at),
    ADD INDEX idx_refresh_tokens_session_active (session_id, revoked_at, expires_at);

-- The composite indexes above preserve FK lookup support before dropping the old unique-per-user index.
ALTER TABLE refresh_tokens
    DROP INDEX uk_refresh_tokens_user;
