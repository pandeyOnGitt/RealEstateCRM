import { NextRequest, NextResponse } from "next/server";
import { updateCallStatus, tryNextAgent } from "@/lib/services/callService";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callId = searchParams.get("callId");

  const formData = await request.formData();
  const callStatus = formData.get("CallStatus") as string;
  const callDuration = formData.get("CallDuration") as string;

  if (!callId) {
    return NextResponse.json({ ok: true });
  }

  const statusMap: Record<string, string> = {
    initiated: "initiated",
    ringing: "ringing",
    "in-progress": "in_progress",
    completed: "completed",
    busy: "busy",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "cancelled",
  };

  const updates: Record<string, unknown> = {
    status: statusMap[callStatus] || callStatus,
  };

  if (callStatus === "completed") {
    updates.ended_at = new Date().toISOString();
    updates.duration_seconds = parseInt(callDuration || "0", 10);
    updates.outcome = "connected";
  }

  if (callStatus === "no-answer" || callStatus === "busy") {
    updates.outcome = callStatus === "busy" ? "busy" : "no_answer";
    updates.ended_at = new Date().toISOString();

    const supabase = createServiceClient();
    const { data: call } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (call?.agent_id) {
      await tryNextAgent(call.organization_id, call.lead_id, [call.agent_id]);
    }
  }

  await updateCallStatus(callId, updates as Parameters<typeof updateCallStatus>[1]);

  return NextResponse.json({ ok: true });
}
