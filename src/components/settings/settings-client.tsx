"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIntegrationSettingsAction } from "@/lib/actions";
import { MobileHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppUrl } from "@/lib/utils";
import type { IntegrationSettings } from "@/lib/types";
import { LogoutButton } from "@/components/layout/logout-button";

export function SettingsClient({
  settings,
  isAdmin,
}: {
  settings: IntegrationSettings | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await updateIntegrationSettingsAction({
      twilio_account_sid: form.get("twilio_account_sid") || undefined,
      twilio_auth_token: form.get("twilio_auth_token") || undefined,
      twilio_phone_number: form.get("twilio_phone_number") || undefined,
      whatsapp_sender_number: form.get("whatsapp_sender_number") || undefined,
      webhook_secret: form.get("webhook_secret") || undefined,
      openai_api_key: form.get("openai_api_key") || undefined,
      assignment_mode: form.get("assignment_mode") as "round_robin" | "manual" | "least_busy",
      social_webhook_url: form.get("social_webhook_url") || undefined,
    });
    setLoading(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <MobileHeader title="Settings" />
      <div className="hidden md:block border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Settings & Integrations</h1>
      </div>
      <div className="p-4 space-y-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>Send leads from external platforms to this endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded-lg bg-muted p-3 text-xs break-all">
              POST {getAppUrl()}/api/webhooks/leads
            </code>
            <p className="mt-2 text-xs text-muted-foreground">
              Header: x-webhook-secret: {settings?.webhook_secret || "your-secret"}
            </p>
          </CardContent>
        </Card>

        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Twilio Voice & SMS</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Account SID</Label><Input name="twilio_account_sid" defaultValue={settings?.twilio_account_sid || ""} /></div>
                <div><Label>Auth Token</Label><Input name="twilio_auth_token" type="password" defaultValue={settings?.twilio_auth_token || ""} /></div>
                <div><Label>Phone Number</Label><Input name="twilio_phone_number" defaultValue={settings?.twilio_phone_number || ""} placeholder="+1234567890" /></div>
                <div><Label>WhatsApp Number</Label><Input name="whatsapp_sender_number" defaultValue={settings?.whatsapp_sender_number || ""} placeholder="+14155238886" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Email & AI</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>OpenAI API Key</Label><Input name="openai_api_key" type="password" defaultValue={settings?.openai_api_key || ""} /></div>
                <div><Label>Social Webhook URL</Label><Input name="social_webhook_url" defaultValue={settings?.social_webhook_url || ""} placeholder="https://hooks.zapier.com/..." /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Lead Assignment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Webhook Secret</Label><Input name="webhook_secret" defaultValue={settings?.webhook_secret || ""} /></div>
                <div>
                  <Label>Assignment Mode</Label>
                  <Select name="assignment_mode" defaultValue={settings?.assignment_mode || "round_robin"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="least_busy">Least Busy Agent</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            {saved && <p className="text-sm text-green-600">Settings saved!</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</Button>
          </form>
        ) : (
          <Card><CardContent className="pt-4 text-sm text-muted-foreground">Only admins can manage integrations.</CardContent></Card>
        )}
        <LogoutButton variant="outline" />
      </div>
    </div>
  );
}
