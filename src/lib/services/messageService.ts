import { createServiceClient } from "@/lib/supabase/service";
import type { MessageChannel } from "@/lib/types";
import { interpolateTemplate, isDryRunMode } from "@/lib/utils";

export interface SendMessageParams {
  organizationId: string;
  leadId: string;
  sentBy: string;
  channel: MessageChannel;
  body: string;
  to: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  dryRun?: boolean;
  error?: string;
}

async function getMessagingConfig(organizationId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  return {
    accountSid: data?.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID,
    authToken: data?.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber:
      data?.whatsapp_sender_number || process.env.TWILIO_WHATSAPP_NUMBER,
    twilioPhone: data?.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER,
  };
}

export async function sendMessage(
  params: SendMessageParams
): Promise<SendMessageResult> {
  const supabase = createServiceClient();

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      sent_by: params.sentBy,
      channel: params.channel,
      body: params.body,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  if (isDryRunMode()) {
    await supabase
      .from("messages")
      .update({ status: "sent", external_id: `DRY_RUN_${Date.now()}` })
      .eq("id", message.id);

    await supabase.from("activities").insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      user_id: params.sentBy,
      type: "message_sent",
      title: `${params.channel.toUpperCase()} sent (dry run)`,
      description: params.body.slice(0, 100),
      metadata: { message_id: message.id, dry_run: true },
    });

    return {
      success: true,
      messageId: message.id,
      externalId: `DRY_RUN_${Date.now()}`,
      dryRun: true,
    };
  }

  try {
    let externalId: string | undefined;

    if (params.channel === "whatsapp" || params.channel === "sms") {
      const config = await getMessagingConfig(params.organizationId);
      if (!config.accountSid || !config.authToken) {
        throw new Error("Twilio not configured");
      }

      const twilio = (await import("twilio")).default;
      const client = twilio(config.accountSid, config.authToken);

      const from =
        params.channel === "whatsapp"
          ? `whatsapp:${config.whatsappNumber}`
          : config.twilioPhone!;

      const to =
        params.channel === "whatsapp"
          ? params.to.startsWith("whatsapp:")
            ? params.to
            : `whatsapp:${params.to}`
          : params.to;

      const result = await client.messages.create({
        from,
        to,
        body: params.body,
      });
      externalId = result.sid;
    }

    await supabase
      .from("messages")
      .update({ status: "sent", external_id: externalId })
      .eq("id", message.id);

    await supabase.from("activities").insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      user_id: params.sentBy,
      type: "message_sent",
      title: `${params.channel.toUpperCase()} sent`,
      description: params.body.slice(0, 100),
      metadata: { message_id: message.id, external_id: externalId },
    });

    return { success: true, messageId: message.id, externalId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    await supabase
      .from("messages")
      .update({ status: "failed" })
      .eq("id", message.id);
    return { success: false, error: msg, messageId: message.id };
  }
}

export async function sendFollowUp(
  organizationId: string,
  leadId: string,
  sentBy: string,
  channel: MessageChannel,
  templateBody: string,
  leadName: string,
  leadPhone: string,
  leadEmail?: string,
  extraVars?: Record<string, string>
) {
  const body = interpolateTemplate(templateBody, {
    leadName,
    preferredLocation: extraVars?.preferredLocation || "",
    propertyTitle: extraVars?.propertyTitle || "",
    location: extraVars?.location || "",
    price: extraVars?.price || "",
    shareLink: extraVars?.shareLink || "",
    ...extraVars,
  });

  const to =
    channel === "email" ? leadEmail || "" : leadPhone;

  if (!to) return { success: false, error: "No contact info for channel" };

  if (channel === "email") {
    const { sendEmail } = await import("./emailService");
    return sendEmail({
      organizationId,
      to,
      subject: "Follow up from EstateVoxa CRM",
      body,
      leadId,
      sentBy,
    });
  }

  return sendMessage({
    organizationId,
    leadId,
    sentBy,
    channel,
    body,
    to,
  });
}

import { DEFAULT_TEMPLATES } from "@/lib/constants/templates";