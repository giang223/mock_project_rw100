CREATE TABLE direct_message_reactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    direct_message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type VARCHAR(12) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_direct_message_reactions_message_user UNIQUE (direct_message_id, user_id),
    INDEX idx_direct_message_reactions_message_type (direct_message_id, reaction_type),
    CONSTRAINT chk_direct_message_reaction_type
        CHECK (reaction_type IN ('LIKE', 'LOVE', 'LAUGH', 'SURPRISED', 'SAD', 'ANGRY')),
    CONSTRAINT fk_direct_message_reactions_message FOREIGN KEY (direct_message_id)
        REFERENCES direct_messages (id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_reactions_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
