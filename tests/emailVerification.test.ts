import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashVerificationCode,
  EMAIL_VERIFICATION_PURPOSE,
} from "@/lib/crypto/otp";
import { createMockSupabase } from "./helpers/mockSupabase";

const SECRET = process.env.OTP_SECRET!;

const sendVerificationCodeEmail = vi.fn(async () => "mock-message-id");

vi.mock("@/lib/services/brevoEmailService", () => ({
  sendVerificationCodeEmail: (...args: unknown[]) =>
    sendVerificationCodeEmail(...args),
}));

function mockSupabaseModule(mock: ReturnType<typeof createMockSupabase>) {
  vi.doMock("@/lib/supabase/service", () => ({
    createServiceClient: () => mock,
  }));
}

describe("email verification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DRY_RUN_MODE = "false";
  });

  it("requests code successfully", async () => {
    const mock = createMockSupabase({ logs: [], profiles: [] });
    mockSupabaseModule(mock);

    const { requestVerificationCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await requestVerificationCode(
      "User@Example.com",
      "127.0.0.1"
    );
    expect(result.message).toContain("verification code has been sent");
    expect(sendVerificationCodeEmail).toHaveBeenCalledOnce();
    expect(mock._codes.length).toBe(1);
    expect(mock._codes[0].code_hash).not.toMatch(/^\d{6}$/);
  });

  it("verifies correct code", async () => {
    const email = "user@example.com";
    const code = "123456";
    const codeHash = hashVerificationCode(
      SECRET,
      email,
      EMAIL_VERIFICATION_PURPOSE,
      code
    );

    const mock = createMockSupabase({
      codes: [
        {
          id: "code-1",
          email,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempt_count: 0,
          consumed_at: null,
          created_at: new Date().toISOString(),
        },
      ],
      profiles: [{ id: "user-1", email }],
      rpcResult: "user-1",
    });
    mockSupabaseModule(mock);

    const { verifyEmailCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await verifyEmailCode(email, code);
    expect(result.verified).toBe(true);
  });

  it("rejects incorrect code and increments attempts", async () => {
    const email = "user@example.com";
    const mock = createMockSupabase({
      codes: [
        {
          id: "code-1",
          email,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          code_hash: hashVerificationCode(
            SECRET,
            email,
            EMAIL_VERIFICATION_PURPOSE,
            "111111"
          ),
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempt_count: 0,
          consumed_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockSupabaseModule(mock);

    const { verifyEmailCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await verifyEmailCode(email, "999999");
    expect(result.verified).toBeUndefined();
    expect(mock._codes[0].attempt_count).toBe(1);
  });

  it("rejects expired code", async () => {
    const email = "user@example.com";
    const code = "123456";
    const mock = createMockSupabase({
      codes: [
        {
          id: "code-1",
          email,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          code_hash: hashVerificationCode(
            SECRET,
            email,
            EMAIL_VERIFICATION_PURPOSE,
            code
          ),
          expires_at: new Date(Date.now() - 1000).toISOString(),
          attempt_count: 0,
          consumed_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockSupabaseModule(mock);

    const { verifyEmailCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await verifyEmailCode(email, code);
    expect(result.message).toContain("invalid or expired");
  });

  it("rejects reused code", async () => {
    const email = "user@example.com";
    const code = "123456";
    const mock = createMockSupabase({
      codes: [
        {
          id: "code-1",
          email,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          code_hash: hashVerificationCode(
            SECRET,
            email,
            EMAIL_VERIFICATION_PURPOSE,
            code
          ),
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempt_count: 0,
          consumed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockSupabaseModule(mock);

    const { verifyEmailCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await verifyEmailCode(email, code);
    expect(result.message).toContain("invalid or expired");
  });

  it("rejects when attempt limit reached", async () => {
    const email = "user@example.com";
    const code = "123456";
    const mock = createMockSupabase({
      codes: [
        {
          id: "code-1",
          email,
          purpose: EMAIL_VERIFICATION_PURPOSE,
          code_hash: hashVerificationCode(
            SECRET,
            email,
            EMAIL_VERIFICATION_PURPOSE,
            code
          ),
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempt_count: 5,
          consumed_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockSupabaseModule(mock);

    const { verifyEmailCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    const result = await verifyEmailCode(email, code);
    expect(result.message).toContain("invalid or expired");
  });

  it("invalidates code when SMTP fails", async () => {
    sendVerificationCodeEmail.mockRejectedValueOnce(new Error("SMTP auth failed"));
    const mock = createMockSupabase({ logs: [] });
    mockSupabaseModule(mock);

    const { requestVerificationCode } = await import(
      "@/lib/services/emailVerificationService"
    );

    await expect(
      requestVerificationCode("fail@example.com", "10.0.0.1")
    ).rejects.toThrow("Email delivery failed");
    expect(mock._codes[0]?.consumed_at).toBeTruthy();
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("blocks requests inside cooldown window", async () => {
    const email = "rate@example.com";
    const mock = createMockSupabase({
      logs: [
        {
          email,
          ip_address: "1.2.3.4",
          action: "request_code",
          created_at: new Date().toISOString(),
        },
      ],
    });
    mockSupabaseModule(mock);

    const { assertCanRequestCode, RateLimitError } = await import(
      "@/lib/services/rateLimitService"
    );

    await expect(assertCanRequestCode(email, "1.2.3.4")).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it("blocks hourly email limit", async () => {
    const email = "hourly@example.com";
    const mock = createMockSupabase({
      logs: Array.from({ length: 5 }, (_, i) => ({
        email,
        ip_address: `10.0.0.${i}`,
        action: "request_code",
        created_at: new Date(Date.now() - i * 120000).toISOString(),
      })),
    });
    mockSupabaseModule(mock);

    const { assertCanRequestCode, RateLimitError } = await import(
      "@/lib/services/rateLimitService"
    );

    await expect(assertCanRequestCode(email, "9.9.9.9")).rejects.toBeInstanceOf(
      RateLimitError
    );
  });
});

describe("smtp config validation", () => {
  it("requires OTP_SECRET length", async () => {
    const prevSkip = process.env.SKIP_SMTP_VALIDATION;
    delete process.env.SKIP_SMTP_VALIDATION;
    process.env.OTP_SECRET = "short";
    vi.resetModules();

    const { validateSmtpConfig } = await import("@/lib/config/smtp");
    expect(() => validateSmtpConfig()).toThrow(/OTP_SECRET/);

    process.env.OTP_SECRET =
      "test-otp-secret-at-least-32-characters-long!!";
    if (prevSkip) process.env.SKIP_SMTP_VALIDATION = prevSkip;
  });
});
