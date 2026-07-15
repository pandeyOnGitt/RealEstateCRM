"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMemberAction } from "@/lib/actions";
import { MobileHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export function TeamClient({ members, canInvite }: { members: Profile[]; canInvite: boolean }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await inviteTeamMemberAction({
      email: form.get("email"),
      role: form.get("role"),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setShowInvite(false);
    setMessage(
      result.dryRun
        ? "Invitation saved (dry-run mode — no email sent). Set DRY_RUN_MODE=false to send."
        : "Invitation email sent successfully."
    );
    router.refresh();
  }

  return (
    <div>
      <MobileHeader title="Team" />
      <div className="hidden md:flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Team</h1>
        {canInvite && <Button onClick={() => setShowInvite(true)}>Invite Member</Button>}
      </div>
      <div className="p-4 space-y-4">
        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {canInvite && showInvite && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleInvite} className="space-y-3">
                <Input name="email" type="email" placeholder="email@company.com" required />
                <Select name="role" defaultValue="sales_agent">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full" disabled={loading}>Send Invite</Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(m.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
