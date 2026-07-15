import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callId = searchParams.get("callId");
  const leadPhone = searchParams.get("leadPhone");
  const leadName = searchParams.get("leadName");

  const formData = await request.formData();
  const digits = formData.get("Digits");

  if (!digits) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to ${leadName} now.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${getAppUrl()}/api/twilio/recording?callId=${callId}">
    ${leadPhone}
  </Dial>
</Response>`;
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }

  if (callId) {
    const supabase = createServiceClient();
    await supabase
      .from("calls")
      .update({ status: "in_progress", outcome: "connected" })
      .eq("id", callId);

    const { data: call } = await supabase
      .from("calls")
      .select("lead_id, organization_id, agent_id")
      .eq("id", callId)
      .single();

    if (call) {
      await supabase
        .from("leads")
        .update({
          status: "contacted",
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", call.lead_id);

      await supabase.from("activities").insert({
        organization_id: call.organization_id,
        lead_id: call.lead_id,
        user_id: call.agent_id,
        type: "call_made",
        title: "Bridge call connected",
        metadata: { call_id: callId },
      });
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to ${leadName} now.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${getAppUrl()}/api/twilio/recording?callId=${callId}">
    ${leadPhone}
  </Dial>
</Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
