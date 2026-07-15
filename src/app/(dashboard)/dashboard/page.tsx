import { requireUser } from "@/lib/auth";
import {
  getDashboardStats,
  getRecentActivities,
  getUnreadNotificationCount,
} from "@/lib/db/queries";
import { MobileHeader } from "@/components/layout/sidebar";
import { StatCard } from "@/components/shared/cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Phone,
  CalendarClock,
  Flame,
  MapPin,
  Building2,
  UserCheck,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, activities, notifCount] = await Promise.all([
    getDashboardStats(user.organization_id),
    getRecentActivities(user.organization_id),
    getUnreadNotificationCount(user.id),
  ]);

  return (
    <div>
      <MobileHeader title="Dashboard" notificationCount={notifCount} />
      <div className="hidden md:block border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.full_name}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/leads/new">
                <Plus className="mr-2 h-4 w-4" /> Add Lead
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard title="New Leads Today" value={stats.newLeadsToday} icon={Users} href="/leads" />
          <StatCard title="Calls Today" value={stats.callsToday} icon={Phone} color="text-blue-600" />
          <StatCard title="Follow-ups Due" value={stats.followupsDueToday} icon={CalendarClock} href="/follow-ups" color="text-orange-600" />
          <StatCard title="Hot Leads" value={stats.hotLeads} icon={Flame} href="/leads?temperature=hot" color="text-red-500" />
          <StatCard title="Site Visits" value={stats.siteVisitsScheduled} icon={MapPin} color="text-teal-600" />
          <StatCard title="Available Inventory" value={stats.availableInventory} icon={Building2} href="/properties" />
          <StatCard title="Checked In" value={`${stats.checkedInToday}/${stats.totalTeam}`} icon={UserCheck} href="/attendance" color="text-green-600" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
          <Button asChild size="sm" className="shrink-0">
            <Link href="/leads/new"><Plus className="mr-1 h-4 w-4" />Add Lead</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/follow-ups">Follow-ups</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/attendance">Check In</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        {activity.user && ` · ${activity.user.full_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
