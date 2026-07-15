import { createServiceClient } from "@/lib/supabase/service";
import type { AssignmentMode, Profile } from "@/lib/types";
import { isDryRunMode } from "@/lib/utils";

export interface AssignmentResult {
  agent: Profile | null;
  mode: AssignmentMode;
  reason?: string;
}

export async function assignLeadToAgent(
  organizationId: string,
  mode?: AssignmentMode
): Promise<AssignmentResult> {
  const supabase = createServiceClient();

  const { data: settings } = await supabase
    .from("integration_settings")
    .select("assignment_mode")
    .eq("organization_id", organizationId)
    .single();

  const assignmentMode =
    mode ||
    settings?.assignment_mode ||
    (process.env.DEFAULT_ASSIGNMENT_MODE as AssignmentMode) ||
    "round_robin";

  if (assignmentMode === "manual") {
    return { agent: null, mode: "manual", reason: "Manual assignment mode" };
  }

  const { data: agents } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("role", "sales_agent")
    .eq("is_active", true)
    .order("last_assigned_at", { ascending: true, nullsFirst: true });

  if (!agents?.length) {
    return { agent: null, mode: assignmentMode, reason: "No active agents" };
  }

  let selectedAgent: Profile;

  if (assignmentMode === "least_busy") {
    const agentLoads = await Promise.all(
      agents.map(async (agent) => {
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_agent_id", agent.id)
          .in("status", ["new", "contacted", "interested", "call_pending"]);
        return { agent, load: count || 0 };
      })
    );
    agentLoads.sort((a, b) => a.load - b.load);
    selectedAgent = agentLoads[0].agent as Profile;
  } else {
    selectedAgent = agents[0] as Profile;
  }

  await supabase
    .from("profiles")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("id", selectedAgent.id);

  return { agent: selectedAgent, mode: assignmentMode };
}

export async function reassignLead(
  leadId: string,
  agentId: string,
  organizationId: string
) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_agent_id: agentId })
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;

  await supabase.from("activities").insert({
    organization_id: organizationId,
    lead_id: leadId,
    type: "lead_assigned",
    title: "Lead reassigned",
    description: `Lead assigned to new agent`,
    metadata: { agent_id: agentId },
  });

  return data;
}
