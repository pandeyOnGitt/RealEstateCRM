import { describe, it, expect } from "vitest";
import {
  generateVerificationCode,
  hashVerificationCode,
  isValidCodeFormat,
  normalizeEmail,
  verifyCodeHash,
  EMAIL_VERIFICATION_PURPOSE,
} from "@/lib/crypto/otp";

const SECRET = "test-otp-secret-at-least-32-characters-long!!";

describe("OTP crypto", () => {
  it("normalizes email addresses consistently", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("generates six-digit codes", () => {
    const code = generateVerificationCode();
    expect(isValidCodeFormat(code)).toBe(true);
  });

  it("does not store reversible plaintext in hash", () => {
    const code = "123456";
    const hash = hashVerificationCode(
      SECRET,
      "user@example.com",
      EMAIL_VERIFICATION_PURPOSE,
      code
    );
    expect(hash).not.toContain(code);
    expect(hash.length).toBe(64);
  });

  it("verifies matching codes", () => {
    const code = "654321";
    const hash = hashVerificationCode(
      SECRET,
      "a@b.com",
      EMAIL_VERIFICATION_PURPOSE,
      code
    );
    expect(
      verifyCodeHash(SECRET, "a@b.com", EMAIL_VERIFICATION_PURPOSE, code, hash)
    ).toBe(true);
  });

  it("rejects incorrect codes", () => {
    const hash = hashVerificationCode(
      SECRET,
      "a@b.com",
      EMAIL_VERIFICATION_PURPOSE,
      "111111"
    );
    expect(
      verifyCodeHash(SECRET, "a@b.com", EMAIL_VERIFICATION_PURPOSE, "999999", hash)
    ).toBe(false);
  });

  it("rejects invalid code format", () => {
    expect(isValidCodeFormat("12345")).toBe(false);
    expect(isValidCodeFormat("abcdef")).toBe(false);
  });
});
