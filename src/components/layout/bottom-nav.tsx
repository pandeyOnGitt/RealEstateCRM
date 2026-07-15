"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Menu,
} from "lucide-react";
import { BottomNavLink } from "@/components/layout/nav-link";
import { useNavigationStart } from "@/components/layout/navigation-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/more", label: "More", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  const startNavigation = useNavigationStart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-bottom md:hidden">
      <div
        className="flex items-center justify-around px-2 py-2"
        onClick={startNavigation}
      >
        {navItems.map(({ href, label, icon }) => (
          <BottomNavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            isActive={pathname.startsWith(href)}
          />
        ))}
      </div>
    </nav>
  );
}
