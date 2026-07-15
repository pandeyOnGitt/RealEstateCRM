import { requireUser } from "@/lib/auth";
import { getFollowups } from "@/lib/db/queries";
import { FollowupsClient } from "@/components/followups/followups-client";

export default async function FollowUpsPage() {
  const user = await requireUser();
  const followups = await getFollowups(user.organization_id);
  return <FollowupsClient followups={followups} />;
}
