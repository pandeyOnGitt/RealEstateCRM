import { NextRequest, NextResponse } from "next/server";
import { updateCallStatus, tryNextAgent } from "@/lib/services/callService";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callId = searchParams.get("callId");
  const leadId = searchParams.get("leadId");
  const leadPhone = searchParams.get("leadPhone");
  const leadName = searchParams.get("leadName");
  const source = searchParams.get("source");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/twilio/connect-lead?callId=${callId}&amp;leadPhone=${encodeURIComponent(leadPhone || "")}&amp;leadName=${encodeURIComponent(leadName || "")}" method="POST">
    <Say voice="alice">New real estate lead from ${source}. Press any key to connect with ${leadName}.</Say>
  </Gather>
  <Say>No input received. Goodbye.</Say>
</Response>`;

  if (callId) {
    await updateCallStatus(callId, { status: "in_progress" });
  }

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
