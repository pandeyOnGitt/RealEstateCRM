import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const EMAIL_VERIFICATION_PURPOSE = "email_verification";
export const MAX_VERIFICATION_ATTEMPTS = 5;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashVerificationCode(
  secret: string,
  email: string,
  purpose: string,
  code: string
): string {
  return createHmac("sha256", secret)
    .update(`${normalizeEmail(email)}:${purpose}:${code}`)
    .digest("hex");
}

export function verifyCodeHash(
  secret: string,
  email: string,
  purpose: string,
  code: string,
  expectedHash: string
): boolean {
  const actual = hashVerificationCode(secret, email, purpose, code);
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expectedHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isValidCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function getExpiryDate(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
