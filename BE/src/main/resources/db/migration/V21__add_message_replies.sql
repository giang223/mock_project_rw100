ALTER TABLE direct_messages
    ADD COLUMN reply_to_message_id BIGINT NULL AFTER media_type,
    ADD INDEX idx_direct_messages_reply_to (reply_to_message_id),
    ADD CONSTRAINT fk_direct_messages_reply_to FOREIGN KEY (reply_to_message_id)
        REFERENCES direct_messages (id) ON DELETE SET NULL;
