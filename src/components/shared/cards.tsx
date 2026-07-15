import { cn, formatCurrency } from "@/lib/utils";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  STATUS_COLORS,
  TEMPERATURE_COLORS,
  type Lead,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Phone, Flame } from "lucide-react";

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{lead.full_name}</h3>
              {lead.temperature === "hot" && (
                <Flame className="h-4 w-4 shrink-0 text-orange-500" />
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{lead.phone}</p>
          </div>
          <Badge className={cn("shrink-0", STATUS_COLORS[lead.status])}>
            {LEAD_STATUS_LABELS[lead.status]}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
          <Badge className={TEMPERATURE_COLORS[lead.temperature]}>
            {lead.temperature}
          </Badge>
          {lead.preferred_location && (
            <span className="text-xs text-muted-foreground">{lead.preferred_location}</span>
          )}
        </div>
        {(lead.budget_min || lead.budget_max) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Budget: {lead.budget_min ? formatCurrency(lead.budget_min) : "—"} –{" "}
            {lead.budget_max ? formatCurrency(lead.budget_max) : "—"}
          </p>
        )}
        {lead.assigned_agent && (
          <p className="mt-2 text-xs text-muted-foreground">
            Agent: {lead.assigned_agent.full_name}
          </p>
        )}
      </div>
    </Link>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color = "text-primary",
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  color?: string;
}) {
  const content = (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function QuickActionBar({
  onCall,
  onWhatsApp,
  onShare,
  loading,
}: {
  onCall: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  loading?: string | null;
}) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background/95 p-3 backdrop-blur safe-bottom md:bottom-0 md:left-64">
      <div className="mx-auto flex max-w-lg gap-2">
        <button
          onClick={onCall}
          disabled={loading === "call"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white tap-target disabled:opacity-50"
        >
          <Phone className="h-4 w-4" />
          {loading === "call" ? "Calling..." : "Call"}
        </button>
        <button
          onClick={onWhatsApp}
          disabled={loading === "whatsapp"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-medium text-white tap-target disabled:opacity-50"
        >
          WhatsApp
        </button>
        <button
          onClick={onShare}
          disabled={loading === "share"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium tap-target disabled:opacity-50"
        >
          Share Property
        </button>
      </div>
    </div>
  );
}
