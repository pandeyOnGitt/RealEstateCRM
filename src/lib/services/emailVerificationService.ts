import { createServiceClient } from "@/lib/supabase/service";
import { getSmtpConfig } from "@/lib/config/smtp";
import {
  EMAIL_VERIFICATION_PURPOSE,
  generateVerificationCode,
  getExpiryDate,
  hashVerificationCode,
  isValidCodeFormat,
  MAX_VERIFICATION_ATTEMPTS,
  normalizeEmail,
  verifyCodeHash,
} from "@/lib/crypto/otp";
import {
  sendVerificationCodeEmail,
} from "@/lib/services/brevoEmailService";
import {
  assertCanRequestCode,
  logVerificationRequest,
} from "@/lib/services/rateLimitService";

export const GENERIC_REQUEST_MESSAGE =
  "If the email address is valid, a verification code has been sent.";

export const GENERIC_VERIFY_FAILURE_MESSAGE =
  "The verification code is invalid or expired.";

export async function requestVerificationCode(
  email: string,
  ipAddress: string
): Promise<{ message: string }> {
  const normalized = normalizeEmail(email);
  const purpose = EMAIL_VERIFICATION_PURPOSE;

  await assertCanRequestCode(normalized, ipAddress);

  const config = getSmtpConfig();
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(
    config.otpSecret,
    normalized,
    purpose,
    code
  );
  const expiresAt = getExpiryDate(config.otpExpiryMinutes).toISOString();

  const supabase = createServiceClient();

  await supabase
    .from("email_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", normalized)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const { data: inserted, error: insertError } = await supabase
    .from("email_verification_codes")
    .insert({
      email: normalized,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("Unable to process verification request");
  }

  try {
    await sendVerificationCodeEmail(normalized, code);
  } catch {
    await supabase
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", inserted.id);
    throw new Error("Email delivery failed");
  }

  await logVerificationRequest(normalized, ipAddress, "request_code");

  return { message: GENERIC_REQUEST_MESSAGE };
}

export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ message: string; verified?: boolean }> {
  const normalized = normalizeEmail(email);
  const purpose = EMAIL_VERIFICATION_PURPOSE;

  if (!isValidCodeFormat(code)) {
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  const supabase = createServiceClient();
  const config = getSmtpConfig();

  const { data: record } = await supabase
    .from("email_verification_codes")
    .select("*")
    .eq("email", normalized)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  if (new Date(record.expires_at) < new Date()) {
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  if (record.attempt_count >= MAX_VERIFICATION_ATTEMPTS) {
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  const isValid = verifyCodeHash(
    config.otpSecret,
    normalized,
    purpose,
    code,
    record.code_hash
  );

  if (!isValid) {
    await supabase
      .from("email_verification_codes")
      .update({ attempt_count: record.attempt_count + 1 })
      .eq("id", record.id);
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  const now = new Date().toISOString();

  const { data: profileId, error: txError } = await supabase.rpc(
    "verify_email_code_transaction",
    {
      p_code_id: record.id,
      p_email: normalized,
      p_now: now,
    }
  );

  if (txError || !profileId) {
    return { message: GENERIC_VERIFY_FAILURE_MESSAGE };
  }

  await supabase.auth.admin.updateUserById(profileId, {
    email_confirm: true,
  });

  return {
    message: "Email verified successfully.",
    verified: true,
  };
}
