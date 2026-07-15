import { requireUser, canManageTeam } from "@/lib/auth";
import { getTeamMembers } from "@/lib/db/queries";
import { TeamClient } from "@/components/team/team-client";

export default async function TeamPage() {
  const user = await requireUser();
  const members = await getTeamMembers(user.organization_id);
  return <TeamClient members={members} canInvite={canManageTeam(user.role)} />;
}
