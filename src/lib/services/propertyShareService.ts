import { createServiceClient } from "@/lib/supabase/service";
import type { MessageChannel } from "@/lib/types";
import { formatCurrency, getAppUrl, interpolateTemplate } from "@/lib/utils";
import { sendFollowUp } from "./messageService";

export interface SharePropertyParams {
  organizationId: string;
  leadId: string;
  propertyId: string;
  sharedBy: string;
  channel: MessageChannel;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
}

export async function sharePropertyWithLead(
  params: SharePropertyParams
) {
  const supabase = createServiceClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*, property_images(*)")
    .eq("id", params.propertyId)
    .single();

  if (!property) return { success: false, error: "Property not found" };

  const shareLink = `${getAppUrl()}/share/${property.share_token}`;

  const template =
    "Hi {{leadName}}, sharing details of {{propertyTitle}} in {{location}}. Price: {{price}}. Photos and details: {{shareLink}}";

  const body = interpolateTemplate(template, {
    leadName: params.leadName,
    propertyTitle: property.title,
    location: property.location,
    price: formatCurrency(property.price),
    shareLink,
  });

  const { data: share } = await supabase
    .from("lead_property_shares")
    .insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      property_id: params.propertyId,
      shared_by: params.sharedBy,
      channel: params.channel,
      share_link: shareLink,
      message_body: body,
    })
    .select()
    .single();

  const result = await sendFollowUp(
    params.organizationId,
    params.leadId,
    params.sharedBy,
    params.channel,
    template,
    params.leadName,
    params.leadPhone,
    params.leadEmail,
    {
      propertyTitle: property.title,
      location: property.location,
      price: formatCurrency(property.price),
      shareLink,
    }
  );

  await supabase.from("activities").insert({
    organization_id: params.organizationId,
    lead_id: params.leadId,
    property_id: params.propertyId,
    user_id: params.sharedBy,
    type: "property_shared",
    title: `Property shared: ${property.title}`,
    description: body,
    metadata: { share_id: share?.id, channel: params.channel },
  });

  return { ...result, shareLink, shareId: share?.id };
}

export async function getRecommendedProperties(
  organizationId: string,
  leadId: string
) {
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) return [];

  let query = supabase
    .from("properties")
    .select("*, property_images(*)")
    .eq("organization_id", organizationId)
    .eq("availability", "available");

  if (lead.property_type) {
    query = query.eq("property_type", lead.property_type);
  }

  if (lead.budget_max) {
    query = query.lte("price", lead.budget_max * 1.1);
  }

  if (lead.budget_min) {
    query = query.gte("price", lead.budget_min * 0.9);
  }

  if (lead.preferred_location) {
    query = query.ilike("location", `%${lead.preferred_location}%`);
  }

  const { data } = await query.limit(5);
  return data || [];
}
