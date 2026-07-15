-- Email verification codes (OTP)
CREATE TABLE email_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'email_verification',
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_active
  ON email_verification_codes (email, purpose, created_at DESC)
  WHERE consumed_at IS NULL;

-- Rate-limit audit log (email + IP)
CREATE TABLE verification_request_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'request_code',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_request_log_email ON verification_request_log (email, created_at DESC);
CREATE INDEX idx_verification_request_log_ip ON verification_request_log (ip_address, created_at DESC);

-- Mark verified emails on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- RLS: service role only (API routes use service client)
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_request_log ENABLE ROW LEVEL SECURITY;

-- No public policies — access via service role key only
