export interface SmtpEnvConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  otpSecret: string;
  otpExpiryMinutes: number;
}

const REQUIRED_SMTP_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
  "OTP_SECRET",
] as const;

export function getSmtpConfig(): SmtpEnvConfig {
  const trim = (v: string | undefined) =>
    (v?.trim() || "").replace(/^["']|["']$/g, "");
  return {
    host: trim(process.env.SMTP_HOST),
    port: Number(trim(process.env.SMTP_PORT) || 587),
    user: trim(process.env.SMTP_USER),
    password: trim(process.env.SMTP_PASSWORD),
    fromEmail: trim(process.env.SMTP_FROM_EMAIL),
    fromName: trim(process.env.SMTP_FROM_NAME) || "EstateVoxa CRM",
    otpSecret: trim(process.env.OTP_SECRET),
    otpExpiryMinutes: Number(trim(process.env.OTP_EXPIRY_MINUTES) || 10),
  };
}

export function validateSmtpConfig(options?: { skip?: boolean }): void {
  if (options?.skip || process.env.SKIP_SMTP_VALIDATION === "true") {
    return;
  }

  const missing = REQUIRED_SMTP_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing required email configuration: ${missing.join(", ")}`
    );
  }

  const otpSecret = process.env.OTP_SECRET || "";
  if (otpSecret.length < 32) {
    throw new Error(
      "OTP_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32"
    );
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive number");
  }

  const expiry = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  if (!Number.isFinite(expiry) || expiry <= 0) {
    throw new Error("OTP_EXPIRY_MINUTES must be a positive number");
  }
}

export function formatSender(fromName: string, fromEmail: string): string {
  const safeName = fromName.replace(/"/g, '\\"');
  return `"${safeName}" <${fromEmail}>`;
}
