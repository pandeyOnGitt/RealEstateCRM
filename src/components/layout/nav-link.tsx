"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

function NavPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={cn("animate-spin", className)} />;
}

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        "data-[pending]:opacity-70 data-[pending]:pointer-events-none"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <NavPendingIndicator className="h-4 w-4 text-primary" />
    </Link>
  );
}

export function BottomNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors tap-target min-w-[4rem]",
        isActive ? "text-primary" : "text-muted-foreground",
        "data-[pending]:opacity-70 data-[pending]:pointer-events-none"
      )}
    >
      <span className="relative">
        <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
        <span className="absolute -right-2 -top-2">
          <NavPendingIndicator className="h-3 w-3 text-primary" />
        </span>
      </span>
      {label}
    </Link>
  );
}
