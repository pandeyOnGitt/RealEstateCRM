import { requireUser, canViewAllLeads } from "@/lib/auth";
import { getLeads } from "@/lib/db/queries";
import { MobileHeader } from "@/components/layout/sidebar";
import { LeadCard, EmptyState } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Suspense } from "react";
import { LeadsFilter } from "@/components/leads/leads-filter";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const leads = await getLeads(user.organization_id, {
    search: params.search,
    status: params.status,
    source: params.source,
    temperature: params.temperature,
    assignedOnly: canViewAllLeads(user.role) ? params.agent : user.id,
  });

  return (
    <div>
      <MobileHeader title="Leads" />
      <div className="hidden md:flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button asChild>
          <Link href="/leads/new"><Plus className="mr-2 h-4 w-4" />Add Lead</Link>
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-muted" />}>
          <LeadsFilter />
        </Suspense>
        <div className="flex justify-end md:hidden">
          <Button asChild size="sm">
            <Link href="/leads/new"><Plus className="mr-1 h-4 w-4" />Add</Link>
          </Button>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="Add a lead manually or connect a webhook to receive leads automatically."
            action={
              <Button asChild>
                <Link href="/leads/new">Add Lead</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
