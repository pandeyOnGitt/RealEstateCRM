import { createServiceClient } from "@/lib/supabase/service";
import { isDryRunMode } from "@/lib/utils";

export async function generateCaption(
  organizationId: string,
  propertyTitle: string,
  location: string,
  postType: string
) {
  if (isDryRunMode() || !process.env.OPENAI_API_KEY) {
    return {
      caption: `🏠 ${propertyTitle} in ${location}\n\nDiscover your dream ${postType.replace("_", " ")} property! Contact us for site visits.\n\n#RealEstate #${location.replace(/\s/g, "")} #PropertyForSale`,
      aiGenerated: true,
      dryRun: true,
    };
  }

  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("integration_settings")
    .select("openai_api_key, openai_base_url")
    .eq("organization_id", organizationId)
    .single();

  const apiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;
  const baseUrl =
    settings?.openai_base_url ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1";

  if (!apiKey) {
    return {
      caption: `🏠 ${propertyTitle} in ${location}\n\nContact us for details!`,
      aiGenerated: false,
    };
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a social media copywriter for a real estate company in India. Write engaging captions with emojis and hashtags.",
          },
          {
            role: "user",
            content: `Write a ${postType.replace("_", " ")} caption for: ${propertyTitle} in ${location}`,
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return { caption, aiGenerated: true };
  } catch {
    return {
      caption: `🏠 ${propertyTitle} in ${location}`,
      aiGenerated: false,
      error: "AI generation failed",
    };
  }
}

export async function publishToWebhook(
  organizationId: string,
  postId: string
) {
  const supabase = createServiceClient();

  const { data: post } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", postId)
    .single();

  const { data: settings } = await supabase
    .from("integration_settings")
    .select("social_webhook_url")
    .eq("organization_id", organizationId)
    .single();

  const webhookUrl = settings?.social_webhook_url;

  if (!webhookUrl) {
    if (isDryRunMode()) {
      await supabase
        .from("social_posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", postId);
      return { success: true, dryRun: true };
    }
    return { success: false, error: "Social webhook not configured" };
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });

    await supabase
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", postId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Webhook failed",
    };
  }
}

export async function getContentCalendar(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("social_posts")
    .select("*, assignee:profiles!assigned_to(full_name)")
    .eq("organization_id", organizationId)
    .gte("scheduled_at", startDate)
    .lte("scheduled_at", endDate)
    .order("scheduled_at");

  return data || [];
}
