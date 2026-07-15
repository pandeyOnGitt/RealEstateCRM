#!/usr/bin/env tsx
/**
 * Development-only SMTP diagnostic.
 * Usage: npm run email:test -- user@example.com
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
// This script always sends a real email — never dry-run.
process.env.DRY_RUN_MODE = "false";

import { validateSmtpConfig } from "../src/lib/config/smtp";
import {
  sendVerificationCodeEmail,
  verifySmtpConnection,
} from "../src/lib/services/brevoEmailService";
import { generateVerificationCode } from "../src/lib/crypto/otp";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run email:test -- recipient@example.com");
    process.exit(1);
  }

  process.env.SKIP_SMTP_VALIDATION = "false";
  validateSmtpConfig();

  console.log("Verifying SMTP connection...");
  await verifySmtpConnection();
  console.log("SMTP connection OK");

  const code = generateVerificationCode();
  console.log(`Sending verification email to ${to}...`);
  const messageId = await sendVerificationCodeEmail(to, code);
  console.log("Sent. Message-ID:", messageId);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("SMTP test failed:", msg);
  if (msg.toLowerCase().includes("authentication") || msg.includes("535")) {
    console.error(`
Brevo SMTP auth tips:
  1. Brevo → Settings → SMTP & API → SMTP keys → create or copy key
  2. SMTP_USER = your login (e.g. xxx@smtp-brevo.com)
  3. SMTP_PASSWORD = the SMTP key (often starts with xsmtpsib-), NOT your Brevo account password
  4. SMTP_FROM_EMAIL must be a verified sender in Brevo → Senders & Domains
  5. Remove quotes/spaces around values in .env.local
`);
  }
  process.exit(1);
});
