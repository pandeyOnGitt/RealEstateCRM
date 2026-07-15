import { createServiceClient } from "@/lib/supabase/service";
import { isDryRunMode } from "@/lib/utils";
import { sendMail } from "@/lib/services/brevoEmailService";
import { getSmtpConfig } from "@/lib/config/smtp";

export interface SendEmailParams {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
  leadId?: string;
  sentBy?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const supabase = createServiceClient();
  const html = `<p>${params.body.replace(/\n/g, "<br>")}</p>`;

  if (params.leadId && params.sentBy) {
    const { data: message } = await supabase
      .from("messages")
      .insert({
        organization_id: params.organizationId,
        lead_id: params.leadId,
        sent_by: params.sentBy,
        channel: "email",
        body: params.body,
        status: "pending",
      })
      .select()
      .single();

    if (isDryRunMode()) {
      await supabase
        .from("messages")
        .update({ status: "sent", external_id: `DRY_RUN_EMAIL_${Date.now()}` })
        .eq("id", message!.id);

      return { success: true, messageId: message!.id, dryRun: true };
    }

    try {
      const config = getSmtpConfig();
      const externalId = await sendMail({
        to: params.to,
        subject: params.subject,
        text: params.body,
        html,
      });

      await supabase
        .from("messages")
        .update({ status: "sent", external_id: externalId })
        .eq("id", message!.id);

      return { success: true, messageId: message!.id, externalId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email failed";
      await supabase
        .from("messages")
        .update({ status: "failed" })
        .eq("id", message!.id);
      return { success: false, error: msg, messageId: message!.id };
    }
  }

  if (isDryRunMode()) {
    return { success: true, dryRun: true };
  }

  return { success: false, error: "Email service not configured" };
}
