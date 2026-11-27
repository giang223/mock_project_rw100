CREATE TABLE oauth_identities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_subject VARCHAR(191) NOT NULL,
    provider_email VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_oauth_identities_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_oauth_identity_provider_subject
        UNIQUE (provider, provider_subject),
    CONSTRAINT uk_oauth_identity_user_provider
        UNIQUE (user_id, provider),
    INDEX idx_oauth_identities_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
