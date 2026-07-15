export type UserRole =
  | "admin"
  | "sales_manager"
  | "sales_agent"
  | "field_executive"
  | "social_media_manager";

export type LeadSource =
  | "36_acre"
  | "magicbricks"
  | "housing"
  | "facebook"
  | "instagram"
  | "website"
  | "referral"
  | "manual"
  | "other";

export type PropertyType =
  | "apartment"
  | "villa"
  | "plot"
  | "commercial"
  | "rental";

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "site_visit_scheduled"
  | "negotiation"
  | "won"
  | "lost"
  | "not_responding"
  | "call_pending";

export type LeadTemperature = "cold" | "warm" | "hot";

export type AvailabilityStatus = "available" | "hold" | "sold" | "rented";

export type CallStatus =
  | "initiated"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy"
  | "cancelled";

export type CallOutcome =
  | "connected"
  | "no_answer"
  | "busy"
  | "failed"
  | "voicemail"
  | "pending";

export type MessageChannel = "whatsapp" | "sms" | "email";

export type FollowupStatus = "pending" | "completed" | "snoozed" | "cancelled";

export type FollowupType = "whatsapp" | "sms" | "email" | "call_reminder";

export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "half_day"
  | "on_leave";

export type SocialPostType =
  | "instagram_reel"
  | "instagram_post"
  | "facebook_post"
  | "linkedin_post"
  | "story";

export type SocialPostStatus = "idea" | "draft" | "scheduled" | "published";

export type ActivityType =
  | "lead_created"
  | "lead_updated"
  | "lead_assigned"
  | "call_made"
  | "call_missed"
  | "message_sent"
  | "property_shared"
  | "note_added"
  | "followup_scheduled"
  | "followup_completed"
  | "status_changed"
  | "site_visit_scheduled"
  | "attendance_checkin"
  | "attendance_checkout";

export type AssignmentMode = "round_robin" | "manual" | "least_busy";

export type NotificationType =
  | "new_lead"
  | "missed_call"
  | "followup_due"
  | "site_visit"
  | "property_shared"
  | "attendance_issue"
  | "social_post_due";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  last_assigned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  property_type?: PropertyType;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  assigned_agent_id?: string;
  notes?: string;
  next_followup_at?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
  assigned_agent?: Profile;
}

export interface Property {
  id: string;
  organization_id: string;
  title: string;
  location: string;
  address?: string;
  property_type: PropertyType;
  price: number;
  size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  furnishing?: string;
  availability: AvailabilityStatus;
  description?: string;
  amenities?: string[];
  units_available?: number;
  owner_developer?: string;
  internal_tags?: string[];
  share_token?: string;
  created_at: string;
  updated_at: string;
  property_images?: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  property_id: string;
  organization_id: string;
  url: string;
  storage_path?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Call {
  id: string;
  organization_id: string;
  lead_id: string;
  agent_id?: string;
  call_sid?: string;
  conference_sid?: string;
  status: CallStatus;
  outcome: CallOutcome;
  duration_seconds: number;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Activity {
  id: string;
  organization_id: string;
  lead_id?: string;
  property_id?: string;
  user_id?: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface Followup {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_to?: string;
  type: FollowupType;
  status: FollowupStatus;
  scheduled_at: string;
  completed_at?: string;
  snoozed_until?: string;
  message_body?: string;
  notes?: string;
  lead?: Lead;
}

export interface Attendance {
  id: string;
  organization_id: string;
  user_id: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  status: AttendanceStatus;
  notes?: string;
  field_visit_notes?: string;
  date: string;
  user?: Profile;
}

export interface SocialPost {
  id: string;
  organization_id: string;
  title: string;
  post_type: SocialPostType;
  caption?: string;
  media_urls?: string[];
  status: SocialPostStatus;
  scheduled_at?: string;
  published_at?: string;
  assigned_to?: string;
  notes?: string;
  ai_generated: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

export interface IntegrationSettings {
  id: string;
  organization_id: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  whatsapp_sender_number?: string;
  resend_api_key?: string;
  assignment_mode: AssignmentMode;
  webhook_secret?: string;
  openai_api_key?: string;
  openai_base_url?: string;
  social_webhook_url?: string;
}

export interface DashboardStats {
  newLeadsToday: number;
  callsToday: number;
  followupsDueToday: number;
  hotLeads: number;
  siteVisitsScheduled: number;
  availableInventory: number;
  checkedInToday: number;
  totalTeam: number;
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  "36_acre": "36 Acre",
  magicbricks: "MagicBricks",
  housing: "Housing.com",
  facebook: "Facebook",
  instagram: "Instagram",
  website: "Website",
  referral: "Referral",
  manual: "Manual",
  other: "Other",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  site_visit_scheduled: "Site Visit Scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  not_responding: "Not Responding",
  call_pending: "Call Pending",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_agent: "Sales Agent",
  field_executive: "Field Executive",
  social_media_manager: "Social Media Manager",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  villa: "Villa",
  plot: "Plot",
  commercial: "Commercial",
  rental: "Rental",
};

export const TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  cold: "bg-blue-100 text-blue-800",
  warm: "bg-orange-100 text-orange-800",
  hot: "bg-red-100 text-red-800",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-purple-100 text-purple-800",
  contacted: "bg-blue-100 text-blue-800",
  interested: "bg-green-100 text-green-800",
  site_visit_scheduled: "bg-teal-100 text-teal-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-100 text-gray-800",
  not_responding: "bg-red-100 text-red-800",
  call_pending: "bg-orange-100 text-orange-800",
};
