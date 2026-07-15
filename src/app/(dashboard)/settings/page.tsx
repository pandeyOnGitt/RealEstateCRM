import { requireUser } from "@/lib/auth";
import { getIntegrationSettings } from "@/lib/db/queries";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getIntegrationSettings(user.organization_id);
  return <SettingsClient settings={settings} isAdmin={user.role === "admin"} />;
}
