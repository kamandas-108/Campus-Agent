-- ─── Campus Agent — database schema ───
--
-- NOTE: I don't have your actual deployed init.sql in front of me, so this
-- file is reconstructed from what audit_service.py's queries expect for
-- cryptographic_audit_log, plus the new `documents` table this change adds.
-- If you already have an init.sql with more in it, merge the `documents`
-- table (and its index) into that file rather than replacing it outright —
-- don't blindly overwrite a file you haven't shown me.

-- Hash-chained audit ledger. Columns match what audit_service.py selects/
-- inserts (sequence_id, thread_id, actor_id, decision, action_type,
-- action_payload, previous_hash, record_hash, created_at).
CREATE TABLE IF NOT EXISTS cryptographic_audit_log (
    sequence_id     SERIAL PRIMARY KEY,
    thread_id       TEXT NOT NULL,
    actor_id        TEXT NOT NULL,
    decision        TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    action_payload  JSONB NOT NULL,
    previous_hash   TEXT NOT NULL,
    record_hash     TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_thread_id ON cryptographic_audit_log(thread_id);

-- Two-way document exchange: students attach supporting documents, faculty
-- attach approval letters/certificates. A single thread_id can have any
-- number of rows here, from either side — that's what makes this different
-- from the old single documentId/documentFilename fields on the request
-- itself. File bytes are stored directly (BYTEA); DocumentStore in
-- main.py falls back to an in-memory dict if this table/DB isn't reachable,
-- so uploads still work without Postgres during local development.
CREATE TABLE IF NOT EXISTS documents (
    id            UUID PRIMARY KEY,
    thread_id     TEXT NOT NULL,
    filename      TEXT NOT NULL,
    content_type  TEXT,
    uploaded_by   TEXT NOT NULL,           -- 'student' or 'faculty'
    file_data     BYTEA,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_thread_id ON documents(thread_id);
