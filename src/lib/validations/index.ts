import { z } from "zod";

export const leadSourceMap: Record<string, string> = {
  "36 Acre": "36_acre",
  "36_acre": "36_acre",
  MagicBricks: "magicbricks",
  magicbricks: "magicbricks",
  Housing: "housing",
  "Housing.com": "housing",
  housing: "housing",
  Facebook: "facebook",
  facebook: "facebook",
  Instagram: "instagram",
  instagram: "instagram",
  Website: "website",
  website: "website",
  Referral: "referral",
  referral: "referral",
  Manual: "manual",
  manual: "manual",
  Other: "other",
  other: "other",
};

export const propertyTypeMap: Record<string, string> = {
  Apartment: "apartment",
  apartment: "apartment",
  Villa: "villa",
  villa: "villa",
  Plot: "plot",
  plot: "plot",
  Commercial: "commercial",
  commercial: "commercial",
  Rental: "rental",
  rental: "rental",
};

export const webhookLeadSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().default("manual"),
  propertyType: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  preferredLocation: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export const createLeadSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string(),
  property_type: z.string().optional(),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  preferred_location: z.string().optional(),
  status: z.string().default("new"),
  temperature: z.string().default("cold"),
  assigned_agent_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  next_followup_at: z.string().optional(),
});

export const createPropertySchema = z.object({
  title: z.string().min(1),
  location: z.string().min(1),
  address: z.string().optional(),
  property_type: z.string(),
  price: z.coerce.number().min(0),
  size_sqft: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  floor: z.coerce.number().optional(),
  furnishing: z.string().optional(),
  availability: z.string().default("available"),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  units_available: z.coerce.number().optional(),
  owner_developer: z.string().optional(),
});

export const followupSchema = z.object({
  lead_id: z.string().uuid(),
  type: z.enum(["whatsapp", "sms", "email", "call_reminder"]),
  scheduled_at: z.string(),
  message_body: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const attendanceCheckInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  notes: z.string().optional(),
});

export const socialPostSchema = z.object({
  title: z.string().min(1),
  post_type: z.string(),
  caption: z.string().optional(),
  status: z.string().default("draft"),
  scheduled_at: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const integrationSettingsSchema = z.object({
  twilio_account_sid: z.string().optional(),
  twilio_auth_token: z.string().optional(),
  twilio_phone_number: z.string().optional(),
  whatsapp_sender_number: z.string().optional(),
  resend_api_key: z.string().optional(),
  webhook_secret: z.string().optional(),
  openai_api_key: z.string().optional(),
  openai_base_url: z.string().optional(),
  assignment_mode: z.enum(["round_robin", "manual", "least_busy"]),
  social_webhook_url: z.string().optional(),
});

export const inviteTeamSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "admin",
    "sales_manager",
    "sales_agent",
    "field_executive",
    "social_media_manager",
  ]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32),
  fullName: z.string().min(2).max(100),
  password: z.string().min(6).max(128),
});
