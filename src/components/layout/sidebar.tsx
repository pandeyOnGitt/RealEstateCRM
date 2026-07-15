"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Clock,
  Share2,
  Settings,
  BarChart3,
  Bell,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/logout-button";
import { SidebarNavLink } from "@/components/layout/nav-link";
import { useNavigationStart } from "@/components/layout/navigation-provider";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/social", label: "Social Media", icon: Share2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: Profile }) {
  const pathname = usePathname();
  const startNavigation = useNavigationStart();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          EF
        </div>
        <div>
          <p className="font-semibold text-sm">EstateFlow CRM</p>
          <p className="text-xs text-muted-foreground">Real Estate CRM</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4" onClick={startNavigation}>
        {sidebarItems.map(({ href, label, icon }) => (
          <SidebarNavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            isActive={pathname.startsWith(href)}
          />
        ))}
      </nav>
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {getInitials(user.full_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {user.role.replace("_", " ")}
            </p>
          </div>
        </div>
        <LogoutButton variant="outline" />
      </div>
    </aside>
  );
}

export function MobileHeader({
  title,
  notificationCount = 0,
}: {
  title: string;
  notificationCount?: number;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
          EF
        </div>
        <h1 className="font-semibold">{title}</h1>
      </div>
      <Link href="/dashboard" className="relative tap-target flex items-center justify-center">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {notificationCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </Link>
    </header>
  );
}
