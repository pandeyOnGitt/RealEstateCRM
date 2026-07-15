import { requireUser } from "@/lib/auth";
import { getReports } from "@/lib/db/queries";
import { getTeamMembers } from "@/lib/db/queries";
import { MobileHeader } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadSource, type LeadStatus } from "@/lib/types";

export default async function ReportsPage() {
  const user = await requireUser();
  const [reports, members] = await Promise.all([
    getReports(user.organization_id),
    getTeamMembers(user.organization_id),
  ]);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.full_name]));

  return (
    <div>
      <MobileHeader title="Reports" />
      <div className="hidden md:block border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>
      <div className="p-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Source</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(reports.leadsBySource).map(([source, count]) => (
              <div key={source} className="flex justify-between text-sm">
                <span>{LEAD_SOURCE_LABELS[source as LeadSource] || source}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(reports.leadsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span>{LEAD_STATUS_LABELS[status as LeadStatus] || status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Won / Lost</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div><p className="text-3xl font-bold text-green-600">{reports.won}</p><p className="text-sm text-muted-foreground">Won</p></div>
              <div><p className="text-3xl font-bold text-red-600">{reports.lost}</p><p className="text-sm text-muted-foreground">Lost</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Follow-ups & Shares</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Follow-ups completed</span><span className="font-semibold">{reports.followupsCompleted}/{reports.followupsTotal}</span></div>
            <div className="flex justify-between"><span>Properties shared</span><span className="font-semibold">{reports.propertiesShared}</span></div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Agent Call Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(reports.agentCalls).map(([agentId, stats]) => (
              <div key={agentId} className="flex justify-between text-sm border-b pb-2">
                <span>{memberMap[agentId] || "Unassigned"}</span>
                <span>{stats.connected}/{stats.total} connected · {Math.round(stats.duration / 60)}m total</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
