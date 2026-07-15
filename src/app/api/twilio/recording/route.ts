import { NextRequest, NextResponse } from "next/server";
import { updateCallStatus } from "@/lib/services/callService";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callId = searchParams.get("callId");

  const formData = await request.formData();
  const recordingUrl = formData.get("RecordingUrl") as string;

  if (callId && recordingUrl) {
    await updateCallStatus(callId, { recording_url: recordingUrl });
  }

  return NextResponse.json({ ok: true });
}
