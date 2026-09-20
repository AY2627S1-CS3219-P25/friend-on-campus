BEGIN;

-- Core account data for registration and login.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (BTRIM(username) <> ''),
    CHECK (BTRIM(email) <> '')
);

-- The application validates input; these indexes make duplicate registration
-- and username changes safe even when requests arrive concurrently.
CREATE UNIQUE INDEX users_username_case_insensitive_uq
    ON users (LOWER(username));
CREATE UNIQUE INDEX users_email_case_insensitive_uq
    ON users (LOWER(email));

-- One row represents one active browser/device login. Access JWTs are
-- short-lived and are not stored. Delete the row to log out or revoke a session.
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    persistent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idle_expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_expiry_idx
    ON sessions (user_id, idle_expires_at);

COMMIT;
