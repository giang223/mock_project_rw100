ALTER TABLE conversation_participants
    ADD COLUMN contact_nickname VARCHAR(100) NULL AFTER last_read_at,
    ADD COLUMN hidden_at DATETIME(6) NULL AFTER contact_nickname,
    ADD INDEX idx_conversation_participant_user_hidden (user_id, hidden_at, conversation_id);
