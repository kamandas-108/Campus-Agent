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


-- ─── RBAC & deadline columns added for v3 features ───
-- If upgrading an existing database, run only the ALTER TABLE statements.
-- The CREATE TABLE statements here are already idempotent (IF NOT EXISTS).

-- Users table (new — stores role alongside login info)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT,
    whatsapp        TEXT,
    department      TEXT,
    role            TEXT NOT NULL DEFAULT 'student'
                        CHECK (role IN ('student','faculty','hod','admin')),
    password_hash   TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Requests table (new — persists _requests_store to Postgres)
-- Mirrors the in-memory dict so dashboards survive restarts.
CREATE TABLE IF NOT EXISTS requests (
    id                   TEXT PRIMARY KEY,
    thread_id            TEXT NOT NULL UNIQUE,
    student_id           UUID REFERENCES users(id),
    student_name         TEXT,
    student_email        TEXT,
    student_whatsapp     TEXT,
    student_department   TEXT,
    assigned_faculty_id  TEXT,
    assigned_faculty_name TEXT,
    course_program       TEXT,
    academic_year        TEXT,
    roll_number          TEXT,
    query                TEXT,
    operation            TEXT,
    status               TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    result               TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at          TIMESTAMP,                          -- NEW
    deadline_at          TIMESTAMP,                          -- NEW
    reminder_sent        BOOLEAN DEFAULT FALSE,              -- NEW
    escalated            BOOLEAN DEFAULT FALSE               -- NEW
);

CREATE INDEX IF NOT EXISTS idx_requests_student_email ON requests(student_email);
CREATE INDEX IF NOT EXISTS idx_requests_status        ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at    ON requests(created_at DESC);

-- If upgrading an existing `requests` table, run these instead:
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP;
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS deadline_at   TIMESTAMP;
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS escalated     BOOLEAN DEFAULT FALSE;
