CREATE TABLE IF NOT EXISTS public.customer_login_limits (
  bucket TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 30)
);
