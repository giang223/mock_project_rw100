CREATE TABLE admin_audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    actor_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    reason VARCHAR(1000),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_admin_audit_created (created_at),
    INDEX idx_admin_audit_target_created (target_user_id, created_at),
    CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_admin_audit_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
