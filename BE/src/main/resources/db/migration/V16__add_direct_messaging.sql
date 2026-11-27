CREATE TABLE conversations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_low_id BIGINT NOT NULL,
    user_high_id BIGINT NOT NULL,
    last_message_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_conversations_user_pair UNIQUE (user_low_id, user_high_id),
    CONSTRAINT chk_conversations_canonical_pair CHECK (user_low_id < user_high_id),
    INDEX idx_conversations_low_activity (user_low_id, last_message_at),
    INDEX idx_conversations_high_activity (user_high_id, last_message_at),
    CONSTRAINT fk_conversations_user_low FOREIGN KEY (user_low_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_conversations_user_high FOREIGN KEY (user_high_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_at DATETIME(6) NULL,
    joined_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_conversation_participant UNIQUE (conversation_id, user_id),
    INDEX idx_conversation_participant_user (user_id, conversation_id),
    CONSTRAINT fk_conversation_participant_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_conversation_participant_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE direct_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_direct_messages_conversation_created (conversation_id, created_at, id),
    INDEX idx_direct_messages_sender_created (sender_id, created_at),
    CONSTRAINT fk_direct_messages_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_direct_messages_sender FOREIGN KEY (sender_id)
        REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
