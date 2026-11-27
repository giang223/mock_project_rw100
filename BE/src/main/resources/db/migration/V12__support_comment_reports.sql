ALTER TABLE reports
    DROP INDEX uk_reports_post_reporter,
    MODIFY COLUMN post_id BIGINT NULL,
    ADD COLUMN comment_id BIGINT NULL AFTER post_id,
    ADD COLUMN reviewed_by BIGINT NULL AFTER reporter_id,
    ADD COLUMN reviewed_at DATETIME(6) NULL AFTER updated_at,
    ADD COLUMN review_note VARCHAR(1000) NULL AFTER reviewed_at;

CREATE UNIQUE INDEX uk_reports_post_reporter ON reports (post_id, reporter_id);
CREATE UNIQUE INDEX uk_reports_comment_reporter ON reports (comment_id, reporter_id);
CREATE INDEX idx_reports_reviewer_created ON reports (reviewed_by, reviewed_at);

ALTER TABLE reports
    ADD CONSTRAINT chk_reports_single_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL)
        OR (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    ADD CONSTRAINT fk_reports_comment FOREIGN KEY (comment_id) REFERENCES comments (id),
    ADD CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id);
