ALTER TABLE reports
    ADD COLUMN assigned_to BIGINT NULL AFTER reviewed_by,
    ADD COLUMN assigned_at DATETIME(6) NULL AFTER reviewed_at,
    ADD INDEX idx_reports_assignee_status_created (assigned_to, status, created_at),
    ADD CONSTRAINT fk_reports_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id);
