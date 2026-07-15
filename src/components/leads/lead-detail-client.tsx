"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  callLeadAction,
  sendFollowUpAction,
  sharePropertyAction,
  updateLeadAction,
  addLeadNoteAction,
} from "@/lib/actions";
import { QuickActionBar } from "@/components/shared/cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  STATUS_COLORS,
  TEMPERATURE_COLORS,
  type Lead,
  type Activity,
  type Property,
} from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowLeft, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DEFAULT_TEMPLATES } from "@/lib/constants/templates";

export function LeadDetailClient({
  lead,
  timeline,
  recommendedProperties,
  templates,
}: {
  lead: Lead;
  timeline: Activity[];
  recommendedProperties: Property[];
  templates: { id: string; name: string; body: string; channel: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");

  async function handleCall() {
    setLoading("call");
    await callLeadAction(lead.id);
    setLoading(null);
    router.refresh();
  }

  async function handleWhatsApp() {
    setLoading("whatsapp");
    const tmpl = templates[0]?.body || DEFAULT_TEMPLATES[0].body;
    await sendFollowUpAction(lead.id, "whatsapp", tmpl);
    setLoading(null);
    router.refresh();
  }

  async function handleShare() {
    if (!selectedProperty) {
      alert("Select a property first");
      return;
    }
    setLoading("share");
    await sharePropertyAction(lead.id, selectedProperty, "whatsapp");
    setLoading(null);
    router.refresh();
  }

  async function handleStatusChange(status: string) {
    await updateLeadAction(lead.id, { status });
    router.refresh();
  }

  async function handleMarkHot() {
    await updateLeadAction(lead.id, { temperature: "hot" });
    router.refresh();
  }

  async function handleAddNote() {
    if (!note.trim()) return;
    await addLeadNoteAction(lead.id, note);
    setNote("");
    router.refresh();
  }

  return (
    <div className="pb-32">
      <div className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/leads"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold">{lead.full_name}</h1>
              {lead.temperature === "hot" && <Flame className="h-4 w-4 text-orange-500" />}
            </div>
            <p className="text-sm text-muted-foreground">{lead.phone}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={STATUS_COLORS[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
          <Badge className={TEMPERATURE_COLORS[lead.temperature]}>{lead.temperature}</Badge>
          <Badge variant="outline">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            {lead.email && <p><span className="text-muted-foreground">Email:</span> {lead.email}</p>}
            {lead.property_type && <p><span className="text-muted-foreground">Type:</span> {PROPERTY_TYPE_LABELS[lead.property_type]}</p>}
            {lead.preferred_location && <p><span className="text-muted-foreground">Location:</span> {lead.preferred_location}</p>}
            {(lead.budget_min || lead.budget_max) && (
              <p><span className="text-muted-foreground">Budget:</span> {lead.budget_min ? formatCurrency(lead.budget_min) : "—"} – {lead.budget_max ? formatCurrency(lead.budget_max) : "—"}</p>
            )}
            {lead.assigned_agent && <p><span className="text-muted-foreground">Agent:</span> {lead.assigned_agent.full_name}</p>}
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Change status" /></SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleMarkHot}>Mark Hot</Button>
        </div>

        {recommendedProperties.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recommended Properties</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Select property to share" /></SelectTrigger>
                <SelectContent>
                  {recommendedProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title} — {formatCurrency(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Add Note</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." rows={2} />
            <Button size="sm" onClick={handleAddNote}>Save Note</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id} className="border-l-2 border-primary/30 pl-4">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {lead.notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap text-sm">{lead.notes}</pre></CardContent>
          </Card>
        )}
      </div>

      <QuickActionBar
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onShare={handleShare}
        loading={loading}
      />
    </div>
  );
}
