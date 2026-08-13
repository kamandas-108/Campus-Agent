CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cryptographic_audit_log (
    sequence_id BIGSERIAL PRIMARY KEY,
    thread_id VARCHAR(100) NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    previous_hash VARCHAR(64) NOT NULL,
    record_hash VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_audit_thread ON cryptographic_audit_log (thread_id);
CREATE INDEX IF NOT EXISTS idx_audit_sequence ON cryptographic_audit_log (sequence_id ASC);
