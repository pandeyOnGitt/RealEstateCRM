"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { completeFollowupAction, snoozeFollowupAction, sendFollowUpAction } from "@/lib/actions";
import { MobileHeader } from "@/components/layout/sidebar";
import { EmptyState } from "@/components/shared/cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Followup } from "@/lib/types";
import { Check, Clock, MessageCircle } from "lucide-react";

function FollowupCard({ followup }: { followup: Followup & { lead?: { full_name: string; id: string; phone: string } } }) {
  const router = useRouter();
  const isOverdue = new Date(followup.scheduled_at) < new Date() && followup.status === "pending";

  return (
    <Card className={isOverdue ? "border-orange-300" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/leads/${followup.lead_id}`} className="font-semibold hover:underline">
              {followup.lead?.full_name || "Unknown Lead"}
            </Link>
            <p className="text-sm text-muted-foreground capitalize">{followup.type.replace("_", " ")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(followup.scheduled_at), "MMM d, h:mm a")}
            </p>
          </div>
          <Badge variant={followup.status === "pending" ? "default" : "secondary"}>{followup.status}</Badge>
        </div>
        {followup.message_body && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{followup.message_body}</p>}
        {followup.status === "pending" && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="whatsapp" onClick={async () => {
              if (followup.message_body && followup.lead) {
                await sendFollowUpAction(followup.lead_id, "whatsapp", followup.message_body);
                await completeFollowupAction(followup.id);
                router.refresh();
              }
            }}>
              <MessageCircle className="mr-1 h-3 w-3" />Send
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await completeFollowupAction(followup.id); router.refresh(); }}>
              <Check className="mr-1 h-3 w-3" />Done
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => { await snoozeFollowupAction(followup.id, 24); router.refresh(); }}>
              <Clock className="mr-1 h-3 w-3" />Snooze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowupsClient({ followups }: { followups: Followup[] }) {
  const pending = followups.filter((f) => f.status === "pending");
  const completed = followups.filter((f) => f.status === "completed");

  return (
    <div>
      <MobileHeader title="Follow-ups" />
      <div className="hidden md:block border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Follow-ups</h1>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <h2 className="mb-3 font-semibold">Due ({pending.length})</h2>
          {pending.length === 0 ? (
            <EmptyState title="All caught up!" description="No pending follow-ups." />
          ) : (
            <div className="space-y-3">{pending.map((f) => <FollowupCard key={f.id} followup={f} />)}</div>
          )}
        </div>
        {completed.length > 0 && (
          <div>
            <h2 className="mb-3 font-semibold text-muted-foreground">Completed</h2>
            <div className="space-y-3">{completed.slice(0, 5).map((f) => <FollowupCard key={f.id} followup={f} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
