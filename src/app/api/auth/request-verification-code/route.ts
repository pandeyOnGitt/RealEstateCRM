import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GENERIC_REQUEST_MESSAGE,
  requestVerificationCode,
} from "@/lib/services/emailVerificationService";
import { RateLimitError } from "@/lib/services/rateLimitService";

const bodySchema = z.object({
  email: z.string().email(),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: GENERIC_REQUEST_MESSAGE },
        { status: 200 }
      );
    }

    await requestVerificationCode(parsed.data.email, getClientIp(request));

    return NextResponse.json({ message: GENERIC_REQUEST_MESSAGE });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { message: GENERIC_REQUEST_MESSAGE },
      { status: 200 }
    );
  }
}
