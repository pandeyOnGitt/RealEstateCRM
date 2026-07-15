import { createServiceClient } from "@/lib/supabase/service";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export interface InvitationDetails {
  id: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  organizationName: string;
  expiresAt: string;
}

export async function getInvitationByToken(
  token: string
): Promise<InvitationDetails | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("team_invitations")
    .select(
      "id, email, role, expires_at, accepted_at, organizations(name)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!data || data.accepted_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const orgRow = data.organizations;
  const org = Array.isArray(orgRow) ? orgRow[0] : orgRow;

  return {
    id: data.id,
    email: data.email,
    role: data.role as UserRole,
    roleLabel: ROLE_LABELS[data.role as UserRole],
    organizationName: org?.name || "your team",
    expiresAt: data.expires_at,
  };
}
