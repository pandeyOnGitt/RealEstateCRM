import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leadPhone = searchParams.get("leadPhone");
  const callId = searchParams.get("callId");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to the lead now.</Say>
  <Dial record="record-from-answer">${leadPhone}</Dial>
</Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
