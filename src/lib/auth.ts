import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] profile fetch failed:", error.message);
    return null;
  }

  return profile;
}

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login?error=missing_profile");
  return profile;
}

export function canManageTeam(role: string) {
  return role === "admin" || role === "sales_manager";
}

export function canManageIntegrations(role: string) {
  return role === "admin";
}

export function canViewAllLeads(role: string) {
  return ["admin", "sales_manager"].includes(role);
}

export function canManageSocial(role: string) {
  return ["admin", "social_media_manager", "sales_manager"].includes(role);
}

export async function confirmAuthUserEmail(userId: string): Promise<boolean> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  return !error;
}
