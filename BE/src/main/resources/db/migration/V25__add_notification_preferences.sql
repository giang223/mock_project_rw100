CREATE TABLE notification_preferences (
    user_id BIGINT NOT NULL,
    social_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    messages_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
