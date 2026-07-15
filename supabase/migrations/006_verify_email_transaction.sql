-- Atomic consume code + mark profile verified
CREATE OR REPLACE FUNCTION verify_email_code_transaction(
  p_code_id UUID,
  p_email TEXT,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  UPDATE email_verification_codes
  SET consumed_at = p_now
  WHERE id = p_code_id
    AND consumed_at IS NULL
    AND expires_at > p_now
    AND attempt_count < 5;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE profiles
  SET email_verified_at = p_now
  WHERE email = p_email
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;
