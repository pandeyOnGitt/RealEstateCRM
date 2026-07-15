import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assignLeadToAgent } from "@/lib/services/leadAssignmentService";
import { initiateBridgeCall } from "@/lib/services/callService";
import {
  webhookLeadSchema,
  leadSourceMap,
  propertyTypeMap,
} from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = webhookLeadSchema.parse(body);

    const supabase = createServiceClient();

    let organizationId = parsed.organizationId;

    if (!organizationId) {
      const secret =
        request.headers.get("x-webhook-secret") ||
        request.headers.get("authorization")?.replace("Bearer ", "");

      if (!secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: settings } = await supabase
        .from("integration_settings")
        .select("organization_id")
        .eq("webhook_secret", secret)
        .single();

      if (!settings) {
        return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
      }
      organizationId = settings.organization_id;
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const source =
      leadSourceMap[parsed.source] || leadSourceMap[parsed.source.toLowerCase()] || "other";
    const propertyType = parsed.propertyType
      ? propertyTypeMap[parsed.propertyType] || propertyTypeMap[parsed.propertyType.toLowerCase()]
      : null;

    const assignment = await assignLeadToAgent(organizationId);
    const agentId = assignment.agent?.id;

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        full_name: parsed.fullName,
        phone: parsed.phone,
        email: parsed.email || null,
        source,
        property_type: propertyType,
        budget_min: parsed.budgetMin,
        budget_max: parsed.budgetMax,
        preferred_location: parsed.preferredLocation,
        notes: parsed.notes,
        assigned_agent_id: agentId,
        status: "new",
        temperature: "warm",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("activities").insert({
      organization_id: organizationId,
      lead_id: lead.id,
      type: "lead_created",
      title: "Lead received via webhook",
      description: `${parsed.fullName} from ${parsed.source}`,
      metadata: { source: parsed.source, webhook: true },
    });

    if (agentId && assignment.agent?.phone) {
      await initiateBridgeCall({
        organizationId,
        leadId: lead.id,
        leadName: lead.full_name,
        leadPhone: lead.phone,
        agentId,
        agentPhone: assignment.agent.phone,
        source: parsed.source,
      });

      await supabase.from("notifications").insert({
        organization_id: organizationId,
        user_id: agentId,
        type: "new_lead",
        title: "New lead assigned",
        body: `${lead.full_name} from ${parsed.source}`,
        link: `/leads/${lead.id}`,
      });
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      assignedAgentId: agentId,
      assignmentMode: assignment.mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
