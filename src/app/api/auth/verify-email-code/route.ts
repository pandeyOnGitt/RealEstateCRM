import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GENERIC_VERIFY_FAILURE_MESSAGE,
  verifyEmailCode,
} from "@/lib/services/emailVerificationService";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: GENERIC_VERIFY_FAILURE_MESSAGE },
        { status: 400 }
      );
    }

    const result = await verifyEmailCode(
      parsed.data.email,
      parsed.data.code
    );

    if (!result.verified) {
      return NextResponse.json(
        { message: GENERIC_VERIFY_FAILURE_MESSAGE },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: result.message });
  } catch {
    return NextResponse.json(
      { message: GENERIC_VERIFY_FAILURE_MESSAGE },
      { status: 500 }
    );
  }
}
