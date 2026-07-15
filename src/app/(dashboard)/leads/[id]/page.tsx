import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getLeadById,
  getLeadTimeline,
  getFollowupTemplates,
} from "@/lib/db/queries";
import { getRecommendedProperties } from "@/lib/services/propertyShareService";
import { LeadDetailClient } from "@/components/leads/lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [lead, timeline, recommended, templates] = await Promise.all([
    getLeadById(id, user.organization_id),
    getLeadTimeline(id),
    getRecommendedProperties(user.organization_id, id),
    getFollowupTemplates(user.organization_id),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={lead}
      timeline={timeline}
      recommendedProperties={recommended}
      templates={templates}
    />
  );
}
