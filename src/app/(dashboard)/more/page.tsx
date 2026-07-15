import Link from "next/link";
import { MobileHeader } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Share2, Users, Settings, BarChart3, ChevronRight } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";

const moreItems = [
  { href: "/attendance", label: "Attendance", icon: Clock, description: "Check in/out with GPS" },
  { href: "/social", label: "Social Media", icon: Share2, description: "Content calendar" },
  { href: "/team", label: "Team", icon: Users, description: "Manage team members" },
  { href: "/reports", label: "Reports", icon: BarChart3, description: "Business performance" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Integrations & config" },
];

export default function MorePage() {
  return (
    <div>
      <MobileHeader title="More" />
      <div className="p-4 space-y-2">
        {moreItems.map(({ href, label, icon: Icon, description }) => (
          <Link key={href} href={href}>
            <Card className="transition-shadow hover:shadow-md active:scale-[0.99]">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
        <div className="pt-2">
          <LogoutButton variant="outline" />
        </div>
      </div>
    </div>
  );
}
