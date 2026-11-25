BEGIN;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_login_limits (
  bucket TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 10)
);

COMMIT;
