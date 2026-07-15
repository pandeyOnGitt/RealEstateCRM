"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  variant = "ghost",
  showIcon = true,
}: {
  className?: string;
  variant?: "ghost" | "outline" | "destructive";
  showIcon?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleLogout}
      disabled={loading}
      className={cn("w-full justify-start", className)}
    >
      {showIcon && <LogOut className="mr-2 h-4 w-4" />}
      {loading ? "Signing out..." : "Log out"}
    </Button>
  );
}
