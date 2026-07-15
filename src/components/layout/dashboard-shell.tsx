"use client";

import { NavigationProvider } from "@/components/layout/navigation-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <NavigationProvider>{children}</NavigationProvider>;
}
