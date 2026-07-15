import { createServiceClient } from "@/lib/supabase/service";
import type { CallOutcome, CallStatus } from "@/lib/types";
import { getAppUrl, isDryRunMode } from "@/lib/utils";

export interface BridgeCallParams {
  organizationId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  agentId: string;
  agentPhone: string;
  source: string;
}

export interface BridgeCallResult {
  success: boolean;
  callId?: string;
  callSid?: string;
  dryRun?: boolean;
  error?: string;
}

async function getTwilioConfig(organizationId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  return {
    accountSid: data?.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID,
    authToken: data?.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: data?.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER,
  };
}

export async function initiateBridgeCall(
  params: BridgeCallParams
): Promise<BridgeCallResult> {
  const supabase = createServiceClient();
  const appUrl = getAppUrl();

  const { data: callRecord, error: callError } = await supabase
    .from("calls")
    .insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      agent_id: params.agentId,
      status: "initiated" as CallStatus,
      outcome: "pending" as CallOutcome,
      started_at: new Date().toISOString(),
      metadata: { source: params.source, dry_run: isDryRunMode() },
    })
    .select()
    .single();

  if (callError) {
    return { success: false, error: callError.message };
  }

  if (isDryRunMode()) {
    await simulateBridgeCall(callRecord.id, params);
    return {
      success: true,
      callId: callRecord.id,
      callSid: `DRY_RUN_${Date.now()}`,
      dryRun: true,
    };
  }

  const config = await getTwilioConfig(params.organizationId);
  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    await supabase
      .from("calls")
      .update({ status: "failed", outcome: "failed" })
      .eq("id", callRecord.id);
    return { success: false, error: "Twilio not configured", callId: callRecord.id };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(config.accountSid, config.authToken);

    const call = await client.calls.create({
      to: params.agentPhone,
      from: config.phoneNumber,
      url: `${appUrl}/api/twilio/agent-answer?callId=${callRecord.id}&leadId=${params.leadId}&leadPhone=${encodeURIComponent(params.leadPhone)}&leadName=${encodeURIComponent(params.leadName)}&source=${encodeURIComponent(params.source)}`,
      statusCallback: `${appUrl}/api/twilio/status?callId=${callRecord.id}`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      record: true,
    });

    await supabase
      .from("calls")
      .update({ call_sid: call.sid, status: "ringing" })
      .eq("id", callRecord.id);

    return { success: true, callId: callRecord.id, callSid: call.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Call failed";
    await supabase
      .from("calls")
      .update({ status: "failed", outcome: "failed" })
      .eq("id", callRecord.id);
    return { success: false, error: message, callId: callRecord.id };
  }
}

async function simulateBridgeCall(callId: string, params: BridgeCallParams) {
  const supabase = createServiceClient();

  await supabase
    .from("calls")
    .update({
      call_sid: `DRY_RUN_${Date.now()}`,
      status: "completed",
      outcome: "connected",
      duration_seconds: 45,
      ended_at: new Date().toISOString(),
      recording_url: null,
      metadata: {
        source: params.source,
        dry_run: true,
        simulated: true,
        message: `Simulated bridge call: Agent ${params.agentPhone} → Lead ${params.leadPhone}`,
      },
    })
    .eq("id", callId);

  await supabase.from("activities").insert({
    organization_id: params.organizationId,
    lead_id: params.leadId,
    user_id: params.agentId,
    type: "call_made",
    title: "Bridge call completed (dry run)",
    description: `Simulated call to ${params.leadName}`,
    metadata: { call_id: callId, dry_run: true },
  });

  await supabase
    .from("leads")
    .update({
      status: "contacted",
      last_contacted_at: new Date().toISOString(),
    })
    .eq("id", params.leadId);
}

export async function tryNextAgent(
  organizationId: string,
  leadId: string,
  excludeAgentIds: string[] = []
) {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) return { success: false, error: "Lead not found" };

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("role", "sales_agent")
    .eq("is_active", true)
    .not("phone", "is", null);

  if (excludeAgentIds.length) {
    query = query.not("id", "in", `(${excludeAgentIds.join(",")})`);
  }

  const { data: agents } = await query.limit(1);

  if (!agents?.length) {
    await supabase
      .from("leads")
      .update({ status: "call_pending" })
      .eq("id", leadId);

    await supabase.from("followups").insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: "call_reminder",
      status: "pending",
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      message_body: "No agent answered — follow up required",
    });

    const { data: managers } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "sales_manager"]);

    for (const manager of managers || []) {
      await supabase.from("notifications").insert({
        organization_id: organizationId,
        user_id: manager.id,
        type: "missed_call",
        title: "Missed lead call",
        body: `No agent answered for lead ${lead.full_name}`,
        link: `/leads/${leadId}`,
      });
    }

    return { success: false, error: "No agents available" };
  }

  const agent = agents[0];
  await supabase
    .from("leads")
    .update({ assigned_agent_id: agent.id })
    .eq("id", leadId);

  return initiateBridgeCall({
    organizationId,
    leadId,
    leadName: lead.full_name,
    leadPhone: lead.phone,
    agentId: agent.id,
    agentPhone: agent.phone!,
    source: lead.source,
  });
}

export async function updateCallStatus(
  callId: string,
  updates: {
    status?: CallStatus;
    outcome?: CallOutcome;
    duration_seconds?: number;
    recording_url?: string;
    conference_sid?: string;
    ended_at?: string;
  }
) {
  const supabase = createServiceClient();
  return supabase.from("calls").update(updates).eq("id", callId);
}

export async function directCallLead(
  organizationId: string,
  leadId: string,
  agentId: string,
  agentPhone: string,
  leadPhone: string
) {
  if (isDryRunMode()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("calls")
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        agent_id: agentId,
        status: "completed",
        outcome: "connected",
        duration_seconds: 30,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        metadata: { dry_run: true, type: "direct" },
      })
      .select()
      .single();
    return { success: true, callId: data?.id, dryRun: true };
  }

  const config = await getTwilioConfig(organizationId);
  if (!config.accountSid || !config.authToken) {
    return { success: false, error: "Twilio not configured" };
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(config.accountSid, config.authToken);
  const appUrl = getAppUrl();

  const { data: callRecord } = await createServiceClient()
    .from("calls")
    .insert({
      organization_id: organizationId,
      lead_id: leadId,
      agent_id: agentId,
      status: "initiated",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const call = await client.calls.create({
    to: agentPhone,
    from: config.phoneNumber!,
    url: `${appUrl}/api/twilio/direct-call?leadPhone=${encodeURIComponent(leadPhone)}&callId=${callRecord?.id}`,
  });

  return { success: true, callSid: call.sid, callId: callRecord?.id };
}
