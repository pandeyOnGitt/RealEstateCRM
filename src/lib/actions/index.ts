"use server";

import { revalidatePath } from "next/cache";
import { requireUser, canManageTeam, confirmAuthUserEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assignLeadToAgent } from "@/lib/services/leadAssignmentService";
import { initiateBridgeCall, directCallLead } from "@/lib/services/callService";
import { sendFollowUp } from "@/lib/services/messageService";
import { sharePropertyWithLead } from "@/lib/services/propertyShareService";
import { checkIn, checkOut } from "@/lib/services/attendanceService";
import { generateCaption, publishToWebhook } from "@/lib/services/socialPostService";
import {
  createLeadSchema,
  createPropertySchema,
  followupSchema,
  inviteTeamSchema,
  acceptInvitationSchema,
  integrationSettingsSchema,
  socialPostSchema,
} from "@/lib/validations";
import { DEFAULT_TEMPLATES } from "@/lib/constants/templates";
import { randomBytes } from "crypto";
import { sendTeamInviteEmail } from "@/lib/services/brevoEmailService";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { getAppUrl } from "@/lib/utils";

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.message.toLowerCase().includes("email not confirmed")) {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profile?.id && (await confirmAuthUserEmail(profile.id))) {
      const retry = await supabase.auth.signInWithPassword({ email, password });
      error = retry.error;
    }
  }

  if (error) return { error: error.message };
  return { success: true };
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const service = createServiceClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const orgName = formData.get("orgName") as string;

  const { data: authData, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!authData.user) return { error: "Signup failed" };

  const slug = orgName.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

  const { data: org } = await service
    .from("organizations")
    .insert({ name: orgName, slug: `${slug}-${Date.now()}` })
    .select()
    .single();

  await service.from("profiles").insert({
    id: authData.user.id,
    organization_id: org!.id,
    email,
    full_name: fullName,
    role: "admin",
  });

  await service.from("integration_settings").insert({
    organization_id: org!.id,
    assignment_mode: "round_robin",
    webhook_secret: randomBytes(32).toString("hex"),
  });

  for (const tmpl of DEFAULT_TEMPLATES) {
    await service.from("followup_templates").insert({
      organization_id: org!.id,
      ...tmpl,
      is_default: true,
    });
  }

  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function createLeadAction(data: unknown) {
  const user = await requireUser();
  const parsed = createLeadSchema.parse(data);
  const supabase = createServiceClient();

  let agentId = parsed.assigned_agent_id;

  if (!agentId) {
    const assignment = await assignLeadToAgent(user.organization_id);
    agentId = assignment.agent?.id;
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      ...parsed,
      organization_id: user.organization_id,
      assigned_agent_id: agentId,
      email: parsed.email || null,
    })
    .select("*, assigned_agent:profiles!assigned_agent_id(*)")
    .single();

  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    organization_id: user.organization_id,
    lead_id: lead.id,
    user_id: user.id,
    type: "lead_created",
    title: "Lead created",
    description: `${lead.full_name} from ${lead.source}`,
  });

  if (agentId) {
    const { data: agent } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agent?.phone) {
      await initiateBridgeCall({
        organizationId: user.organization_id,
        leadId: lead.id,
        leadName: lead.full_name,
        leadPhone: lead.phone,
        agentId: agent.id,
        agentPhone: agent.phone,
        source: lead.source,
      });
    }

    await supabase.from("notifications").insert({
      organization_id: user.organization_id,
      user_id: agentId,
      type: "new_lead",
      title: "New lead assigned",
      body: `${lead.full_name} — ${lead.source}`,
      link: `/leads/${lead.id}`,
    });
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, lead };
}

export async function updateLeadAction(id: string, data: Record<string, unknown>) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("leads")
    .update(data)
    .eq("id", id)
    .eq("organization_id", user.organization_id);

  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    organization_id: user.organization_id,
    lead_id: id,
    user_id: user.id,
    type: data.status ? "status_changed" : "lead_updated",
    title: data.status ? `Status changed to ${data.status}` : "Lead updated",
    metadata: data,
  });

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return { success: true };
}

export async function addLeadNoteAction(leadId: string, note: string) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("notes")
    .eq("id", leadId)
    .single();

  const existingNotes = lead?.notes || "";
  const timestamp = new Date().toLocaleString("en-IN");
  const newNotes = `${existingNotes}\n[${timestamp}] ${user.full_name}: ${note}`.trim();

  await supabase
    .from("leads")
    .update({ notes: newNotes })
    .eq("id", leadId);

  await supabase.from("activities").insert({
    organization_id: user.organization_id,
    lead_id: leadId,
    user_id: user.id,
    type: "note_added",
    title: "Note added",
    description: note,
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function callLeadAction(leadId: string) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead || !user.phone) return { error: "Cannot initiate call" };

  const result = await directCallLead(
    user.organization_id,
    leadId,
    user.id,
    user.phone,
    lead.phone
  );

  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function sendFollowUpAction(
  leadId: string,
  channel: "whatsapp" | "sms" | "email",
  templateBody: string
) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) return { error: "Lead not found" };

  const result = await sendFollowUp(
    user.organization_id,
    leadId,
    user.id,
    channel,
    templateBody,
    lead.full_name,
    lead.phone,
    lead.email,
    { preferredLocation: lead.preferred_location || "" }
  );

  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function sharePropertyAction(
  leadId: string,
  propertyId: string,
  channel: "whatsapp" | "sms" | "email"
) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) return { error: "Lead not found" };

  const result = await sharePropertyWithLead({
    organizationId: user.organization_id,
    leadId,
    propertyId,
    sharedBy: user.id,
    channel,
    leadName: lead.full_name,
    leadPhone: lead.phone,
    leadEmail: lead.email,
  });

  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function createPropertyAction(data: unknown) {
  const user = await requireUser();
  const parsed = createPropertySchema.parse(data);
  const supabase = createServiceClient();

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ ...parsed, organization_id: user.organization_id })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/properties");
  return { success: true, property };
}

export async function createFollowupAction(data: unknown) {
  const user = await requireUser();
  const parsed = followupSchema.parse(data);
  const supabase = createServiceClient();

  const { error } = await supabase.from("followups").insert({
    ...parsed,
    organization_id: user.organization_id,
    assigned_to: parsed.assigned_to || user.id,
  });

  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    organization_id: user.organization_id,
    lead_id: parsed.lead_id,
    user_id: user.id,
    type: "followup_scheduled",
    title: "Follow-up scheduled",
    description: parsed.message_body,
  });

  revalidatePath("/follow-ups");
  return { success: true };
}

export async function completeFollowupAction(id: string) {
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: followup } = await supabase
    .from("followups")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (followup) {
    await supabase.from("activities").insert({
      organization_id: user.organization_id,
      lead_id: followup.lead_id,
      user_id: user.id,
      type: "followup_completed",
      title: "Follow-up completed",
    });
  }

  revalidatePath("/follow-ups");
  return { success: true };
}

export async function snoozeFollowupAction(id: string, hours: number) {
  const user = await requireUser();
  const supabase = createServiceClient();

  await supabase
    .from("followups")
    .update({
      status: "snoozed",
      snoozed_until: new Date(Date.now() + hours * 3600000).toISOString(),
      scheduled_at: new Date(Date.now() + hours * 3600000).toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", user.organization_id);

  revalidatePath("/follow-ups");
  return { success: true };
}

export async function checkInAction(latitude: number, longitude: number, notes?: string) {
  const user = await requireUser();
  const data = await checkIn({
    organizationId: user.organization_id,
    userId: user.id,
    latitude,
    longitude,
    notes,
  });
  revalidatePath("/attendance");
  return { success: true, data };
}

export async function checkOutAction(latitude: number, longitude: number) {
  const user = await requireUser();
  const data = await checkOut(
    user.organization_id,
    user.id,
    latitude,
    longitude
  );
  revalidatePath("/attendance");
  return { success: true, data };
}

export async function createSocialPostAction(data: unknown) {
  const user = await requireUser();
  const parsed = socialPostSchema.parse(data);
  const supabase = createServiceClient();

  const { error } = await supabase.from("social_posts").insert({
    ...parsed,
    organization_id: user.organization_id,
    assigned_to: parsed.assigned_to || user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/social");
  return { success: true };
}

export async function generateCaptionAction(
  propertyTitle: string,
  location: string,
  postType: string
) {
  const user = await requireUser();
  return generateCaption(user.organization_id, propertyTitle, location, postType);
}

export async function publishSocialPostAction(postId: string) {
  const user = await requireUser();
  return publishToWebhook(user.organization_id, postId);
}

export async function inviteTeamMemberAction(data: unknown) {
  const user = await requireUser();
  if (!canManageTeam(user.role)) return { error: "Unauthorized" };

  const parsed = inviteTeamSchema.parse(data);
  const supabase = createServiceClient();
  const token = randomBytes(32).toString("hex");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", user.organization_id)
    .single();

  const { error } = await supabase.from("team_invitations").insert({
    organization_id: user.organization_id,
    email: parsed.email.trim().toLowerCase(),
    role: parsed.role,
    invited_by: user.id,
    token,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  if (error) return { error: error.message };

  try {
    const { dryRun } = await sendTeamInviteEmail({
      to: parsed.email,
      inviterName: user.full_name,
      organizationName: org?.name || "your team",
      roleLabel: ROLE_LABELS[parsed.role as UserRole],
      inviteUrl: `${getAppUrl()}/invite/${token}`,
    });

    revalidatePath("/team");
    return { success: true, dryRun };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Email delivery failed";
    console.error("[email] team invite failed:", reason);
    await supabase.from("team_invitations").delete().eq("token", token);
    return { error: reason };
  }
}

export async function acceptInvitationAction(data: unknown) {
  const parsed = acceptInvitationSchema.parse(data);
  const service = createServiceClient();

  const { data: invitation } = await service
    .from("team_invitations")
    .select("id, email, role, organization_id, expires_at, accepted_at")
    .eq("token", parsed.token)
    .maybeSingle();

  if (!invitation || invitation.accepted_at) {
    return { error: "This invitation is invalid or has already been used." };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "This invitation has expired. Ask your admin to send a new one." };
  }

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id")
    .eq("email", invitation.email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  const { data: authData, error: authError } =
    await service.auth.admin.createUser({
      email: invitation.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.fullName },
    });

  if (authError || !authData.user) {
    const msg = authError?.message?.toLowerCase() || "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: "An account with this email already exists. Please sign in instead.",
      };
    }
    return { error: "Unable to create your account. Please try again." };
  }

  const userId = authData.user.id;
  if (!(await confirmAuthUserEmail(userId))) {
    await service.auth.admin.deleteUser(userId);
    return { error: "Unable to verify your email. Please try again." };
  }

  const now = new Date().toISOString();

  const { error: profileError } = await service.from("profiles").insert({
    id: userId,
    organization_id: invitation.organization_id,
    email: invitation.email,
    full_name: parsed.fullName,
    role: invitation.role,
    email_verified_at: now,
  });

  if (profileError) {
    await service.auth.admin.deleteUser(userId);
    return { error: "Unable to complete setup. Please try again." };
  }

  const { error: acceptError } = await service
    .from("team_invitations")
    .update({ accepted_at: now })
    .eq("id", invitation.id)
    .is("accepted_at", null);

  if (acceptError) {
    return { error: "Account created but invitation could not be finalized." };
  }

  const supabase = await createClient();
  let { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password: parsed.password,
  });

  if (
    signInError?.message.toLowerCase().includes("email not confirmed") &&
    (await confirmAuthUserEmail(userId))
  ) {
    const retry = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: parsed.password,
    });
    signInError = retry.error;
  }

  if (signInError) {
    return {
      success: true,
      requiresLogin: true,
      message: "Account created. Please sign in with your email and password.",
    };
  }

  return { success: true };
}

export async function updateIntegrationSettingsAction(data: unknown) {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Unauthorized" };

  const parsed = integrationSettingsSchema.parse(data);
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("integration_settings")
    .upsert({ ...parsed, organization_id: user.organization_id });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLeadAction(id: string) {
  const user = await requireUser();
  if (!canManageTeam(user.role)) return { error: "Unauthorized" };

  const supabase = createServiceClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidatePath("/leads");
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const user = await requireUser();
  const supabase = createServiceClient();
  await supabase.from("properties").delete().eq("id", id);
  revalidatePath("/properties");
  return { success: true };
}
