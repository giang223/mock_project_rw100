CREATE INDEX idx_admin_audit_actor_created ON admin_audit_logs (actor_id, created_at);
CREATE INDEX idx_admin_audit_action_created ON admin_audit_logs (action, created_at);
