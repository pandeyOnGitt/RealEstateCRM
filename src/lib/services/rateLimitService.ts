import { createServiceClient } from "@/lib/supabase/service";

const EMAIL_COOLDOWN_SECONDS = 60;
const EMAIL_HOURLY_LIMIT = 5;
const IP_HOURLY_LIMIT = 20;

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function logVerificationRequest(
  email: string,
  ipAddress: string,
  action: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("verification_request_log").insert({
    email,
    ip_address: ipAddress,
    action,
  });
}

export async function assertCanRequestCode(
  email: string,
  ipAddress: string
): Promise<void> {
  const supabase = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const cooldownAgo = new Date(
    Date.now() - EMAIL_COOLDOWN_SECONDS * 1000
  ).toISOString();

  const { data: recentEmail } = await supabase
    .from("verification_request_log")
    .select("created_at")
    .eq("email", email)
    .eq("action", "request_code")
    .gte("created_at", cooldownAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentEmail?.length) {
    throw new RateLimitError();
  }

  const { count: emailHourly } = await supabase
    .from("verification_request_log")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .eq("action", "request_code")
    .gte("created_at", oneHourAgo);

  if ((emailHourly || 0) >= EMAIL_HOURLY_LIMIT) {
    throw new RateLimitError();
  }

  const { count: ipHourly } = await supabase
    .from("verification_request_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .eq("action", "request_code")
    .gte("created_at", oneHourAgo);

  if ((ipHourly || 0) >= IP_HOURLY_LIMIT) {
    throw new RateLimitError();
  }
}
