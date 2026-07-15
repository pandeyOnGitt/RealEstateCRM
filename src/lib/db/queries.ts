import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { DashboardStats, Lead, Profile } from "@/lib/types";

export async function getDashboardStats(
  organizationId: string
): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    { count: newLeadsToday },
    { count: callsToday },
    { count: followupsDueToday },
    { count: hotLeads },
    { count: siteVisitsScheduled },
    { count: availableInventory },
    { count: checkedInToday },
    { count: totalTeam },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", todayIso),
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", todayIso),
    supabase
      .from("followups")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .gte("scheduled_at", todayIso),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("temperature", "hot"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "site_visit_scheduled"),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("availability", "available"),
    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("date", todayIso.split("T")[0])
      .not("check_in_time", "is", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);

  return {
    newLeadsToday: newLeadsToday || 0,
    callsToday: callsToday || 0,
    followupsDueToday: followupsDueToday || 0,
    hotLeads: hotLeads || 0,
    siteVisitsScheduled: siteVisitsScheduled || 0,
    availableInventory: availableInventory || 0,
    checkedInToday: checkedInToday || 0,
    totalTeam: totalTeam || 0,
  };
}

export async function getRecentActivities(organizationId: string, limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, user:profiles(full_name, avatar_url)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getLeads(
  organizationId: string,
  filters?: {
    search?: string;
    status?: string;
    source?: string;
    temperature?: string;
    agentId?: string;
    assignedOnly?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*, assigned_agent:profiles!assigned_agent_id(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.temperature) query = query.eq("temperature", filters.temperature);
  if (filters?.agentId) query = query.eq("assigned_agent_id", filters.agentId);
  if (filters?.assignedOnly)
    query = query.eq("assigned_agent_id", filters.assignedOnly);

  const { data } = await query;
  return (data || []) as Lead[];
}

export async function getLeadById(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, assigned_agent:profiles!assigned_agent_id(*)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  return data as Lead | null;
}

export async function getLeadTimeline(leadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, user:profiles(full_name, avatar_url)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getLeadCalls(leadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calls")
    .select("*, agent:profiles(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getProperties(
  organizationId: string,
  filters?: {
    search?: string;
    type?: string;
    status?: string;
    location?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*, property_images(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
    );
  }
  if (filters?.type) query = query.eq("property_type", filters.type);
  if (filters?.status) query = query.eq("availability", filters.status);
  if (filters?.location)
    query = query.ilike("location", `%${filters.location}%`);

  const { data } = await query;
  return data || [];
}

export async function getPropertyById(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(*), property_documents(*)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  return data;
}

export async function getPropertyByShareToken(token: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(*)")
    .eq("share_token", token)
    .single();
  return data;
}

export async function getFollowups(
  organizationId: string,
  status?: string,
  assignedTo?: string
) {
  const supabase = await createClient();
  let query = supabase
    .from("followups")
    .select("*, lead:leads(*)")
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: true });

  if (status) query = query.eq("status", status);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data } = await query;
  return data || [];
}

export async function getTeamMembers(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name");
  return (data || []) as Profile[];
}

export async function getNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count || 0;
}

export async function getReports(organizationId: string) {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("source, status, temperature, assigned_agent_id")
    .eq("organization_id", organizationId);

  const { data: calls } = await supabase
    .from("calls")
    .select("agent_id, outcome, duration_seconds")
    .eq("organization_id", organizationId);

  const { data: shares } = await supabase
    .from("lead_property_shares")
    .select("id, channel")
    .eq("organization_id", organizationId);

  const { data: followups } = await supabase
    .from("followups")
    .select("status")
    .eq("organization_id", organizationId);

  const leadsBySource: Record<string, number> = {};
  const leadsByStatus: Record<string, number> = {};
  let won = 0;
  let lost = 0;

  for (const lead of leads || []) {
    leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1;
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    if (lead.status === "won") won++;
    if (lead.status === "lost") lost++;
  }

  const agentCalls: Record<string, { total: number; connected: number; duration: number }> = {};
  for (const call of calls || []) {
    const id = call.agent_id || "unassigned";
    if (!agentCalls[id]) agentCalls[id] = { total: 0, connected: 0, duration: 0 };
    agentCalls[id].total++;
    if (call.outcome === "connected") agentCalls[id].connected++;
    agentCalls[id].duration += call.duration_seconds || 0;
  }

  const followupsCompleted = (followups || []).filter(
    (f) => f.status === "completed"
  ).length;

  return {
    leadsBySource,
    leadsByStatus,
    agentCalls,
    propertiesShared: shares?.length || 0,
    followupsCompleted,
    followupsTotal: followups?.length || 0,
    won,
    lost,
  };
}

export async function getIntegrationSettings(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();
  return data;
}

export async function getSocialPosts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_posts")
    .select("*, assignee:profiles!assigned_to(full_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getFollowupTemplates(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followup_templates")
    .select("*")
    .eq("organization_id", organizationId);
  return data || [];
}
