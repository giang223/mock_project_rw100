-- Old sessions and one-time links must not survive the storage format change.
DELETE FROM refresh_tokens;
ALTER TABLE refresh_tokens
    CHANGE COLUMN token token_hash VARCHAR(64) NOT NULL;

DELETE FROM password_reset_tokens;
ALTER TABLE password_reset_tokens
    CHANGE COLUMN token token_hash VARCHAR(64) NOT NULL;

DELETE FROM email_verification_tokens;
ALTER TABLE email_verification_tokens
    CHANGE COLUMN token code_hash VARCHAR(255) NOT NULL,
    ADD COLUMN attempts INT NOT NULL DEFAULT 0 AFTER expires_at;
