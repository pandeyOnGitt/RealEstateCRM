import nodemailer, { type Transporter } from "nodemailer";
import {
  formatSender,
  getSmtpConfig,
  type SmtpEnvConfig,
} from "@/lib/config/smtp";
import { isDryRunMode } from "@/lib/utils";

let transporter: Transporter | null = null;

function buildTransportConfig(config: SmtpEnvConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  };
}

export function getSmtpTransporter(): Transporter {
  if (!transporter) {
    const config = getSmtpConfig();
    transporter = nodemailer.createTransport(buildTransportConfig(config));
  }
  return transporter;
}

export function resetSmtpTransporter(): void {
  transporter = null;
}

export async function verifySmtpConnection(): Promise<void> {
  const transport = getSmtpTransporter();
  await transport.verify();
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(options: SendMailOptions): Promise<string> {
  const config = getSmtpConfig();
  const from = formatSender(config.fromName, config.fromEmail);

  try {
    const info = await getSmtpTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return String(info.messageId || "");
  } catch (err) {
    throw mapSmtpError(err);
  }
}

export function buildVerificationEmailContent(
  code: string,
  expiresMinutes: number,
  appName: string
): { subject: string; text: string; html: string } {
  const subject = `${appName} — your verification code`;
  const text = [
    `Your ${appName} verification code is: ${code}`,
    ``,
    `This code expires in ${expiresMinutes} minutes.`,
    `If you did not request this, you can ignore this email.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:22px;color:#0f766e;">${appName}</h1>
          <p style="margin:0 0 24px;color:#71717a;font-size:14px;">Email verification</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;">Use this code to verify your email address:</p>
          <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f766e;">${code}</span>
          </div>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Expires in ${expiresMinutes} minutes.</p>
          <p style="margin:0;color:#a1a1aa;font-size:12px;">If you did not request this code, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendVerificationCodeEmail(
  to: string,
  code: string
): Promise<string> {
  if (isDryRunMode()) {
    return `DRY_RUN_VERIFICATION_${Date.now()}`;
  }

  const config = getSmtpConfig();
  const content = buildVerificationEmailContent(
    code,
    config.otpExpiryMinutes,
    config.fromName
  );

  return sendMail({
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

export interface TeamInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  roleLabel: string;
  inviteUrl: string;
}

export function buildTeamInviteEmailContent(
  params: TeamInviteEmailParams,
  appName: string
): { subject: string; text: string; html: string } {
  const subject = `${appName} — you're invited to join ${params.organizationName}`;
  const text = [
    `${params.inviterName} invited you to join ${params.organizationName} on ${appName} as ${params.roleLabel}.`,
    ``,
    `Accept your invitation:`,
    params.inviteUrl,
    ``,
    `This link expires in 7 days.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:22px;color:#0f766e;">${appName}</h1>
          <p style="margin:0 0 24px;color:#71717a;font-size:14px;">Team invitation</p>
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;"><strong>${params.inviterName}</strong> invited you to join <strong>${params.organizationName}</strong> as <strong>${params.roleLabel}</strong>.</p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${params.inviteUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Accept invitation</a>
          </p>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px;">This link expires in 7 days.</p>
          <p style="margin:0;color:#a1a1aa;font-size:12px;">If you did not expect this invitation, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendTeamInviteEmail(
  params: TeamInviteEmailParams
): Promise<{ messageId: string; dryRun: boolean }> {
  if (isDryRunMode()) {
    return {
      messageId: `DRY_RUN_INVITE_${Date.now()}`,
      dryRun: true,
    };
  }

  const config = getSmtpConfig();
  const content = buildTeamInviteEmailContent(params, config.fromName);

  const messageId = await sendMail({
    to: params.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return { messageId, dryRun: false };
}

function mapSmtpError(err: unknown): Error {
  if (!(err instanceof Error)) {
    return new Error("Email delivery failed");
  }

  const message = err.message.toLowerCase();
  if (message.includes("authentication") || message.includes("535")) {
    return new Error("SMTP authentication failed");
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return new Error("SMTP connection timeout");
  }
  if (message.includes("sender") || message.includes("from address")) {
    return new Error("Invalid sender address");
  }
  if (message.includes("550") || message.includes("rejected")) {
    return new Error("Email rejected by provider");
  }
  return new Error("Email delivery failed");
}

/** @internal Test hook */
export function createTestTransporter(mock: Transporter): void {
  transporter = mock;
}
