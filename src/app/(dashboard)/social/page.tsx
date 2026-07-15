import { requireUser } from "@/lib/auth";
import { getSocialPosts } from "@/lib/db/queries";
import { SocialClient } from "@/components/social/social-client";

export default async function SocialPage() {
  const user = await requireUser();
  const posts = await getSocialPosts(user.organization_id);
  return <SocialClient posts={posts} />;
}
