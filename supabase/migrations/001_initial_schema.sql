-- EstateVoxa CRM Database Schema
-- Run with: supabase db push or apply via Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM (
  'admin',
  'sales_manager',
  'sales_agent',
  'field_executive',
  'social_media_manager'
);

CREATE TYPE lead_source AS ENUM (
  '36_acre',
  'magicbricks',
  'housing',
  'facebook',
  'instagram',
  'website',
  'referral',
  'manual',
  'other'
);

CREATE TYPE property_type AS ENUM (
  'apartment',
  'villa',
  'plot',
  'commercial',
  'rental'
);

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'interested',
  'site_visit_scheduled',
  'negotiation',
  'won',
  'lost',
  'not_responding',
  'call_pending'
);

CREATE TYPE lead_temperature AS ENUM (
  'cold',
  'warm',
  'hot'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'hold',
  'sold',
  'rented'
);

CREATE TYPE furnishing_status AS ENUM (
  'unfurnished',
  'semi_furnished',
  'fully_furnished'
);

CREATE TYPE call_status AS ENUM (
  'initiated',
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'no_answer',
  'busy',
  'cancelled'
);

CREATE TYPE call_outcome AS ENUM (
  'connected',
  'no_answer',
  'busy',
  'failed',
  'voicemail',
  'pending'
);

CREATE TYPE message_channel AS ENUM (
  'whatsapp',
  'sms',
  'email'
);

CREATE TYPE message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed'
);

CREATE TYPE followup_status AS ENUM (
  'pending',
  'completed',
  'snoozed',
  'cancelled'
);

CREATE TYPE followup_type AS ENUM (
  'whatsapp',
  'sms',
  'email',
  'call_reminder'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'late',
  'absent',
  'half_day',
  'on_leave'
);

CREATE TYPE social_post_type AS ENUM (
  'instagram_reel',
  'instagram_post',
  'facebook_post',
  'linkedin_post',
  'story'
);

CREATE TYPE social_post_status AS ENUM (
  'idea',
  'draft',
  'scheduled',
  'published'
);

CREATE TYPE activity_type AS ENUM (
  'lead_created',
  'lead_updated',
  'lead_assigned',
  'call_made',
  'call_missed',
  'message_sent',
  'property_shared',
  'note_added',
  'followup_scheduled',
  'followup_completed',
  'status_changed',
  'site_visit_scheduled',
  'attendance_checkin',
  'attendance_checkout'
);

CREATE TYPE assignment_mode AS ENUM (
  'round_robin',
  'manual',
  'least_busy'
);

CREATE TYPE notification_type AS ENUM (
  'new_lead',
  'missed_call',
  'followup_due',
  'site_visit',
  'property_shared',
  'attendance_issue',
  'social_post_due'
);

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'sales_agent',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team invitations
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales_agent',
  invited_by UUID REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source lead_source NOT NULL DEFAULT 'manual',
  property_type property_type,
  budget_min NUMERIC,
  budget_max NUMERIC,
  preferred_location TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  temperature lead_temperature NOT NULL DEFAULT 'cold',
  assigned_agent_id UUID REFERENCES profiles(id),
  notes TEXT,
  next_followup_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_agent ON leads(assigned_agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  property_type property_type NOT NULL,
  price NUMERIC NOT NULL,
  size_sqft NUMERIC,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  furnishing furnishing_status DEFAULT 'unfurnished',
  availability availability_status NOT NULL DEFAULT 'available',
  description TEXT,
  amenities TEXT[],
  units_available INTEGER DEFAULT 1,
  owner_developer TEXT,
  internal_tags TEXT[],
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_status ON properties(availability);

-- Property images
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property documents
CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead property shares
CREATE TABLE lead_property_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES profiles(id),
  channel message_channel NOT NULL,
  share_link TEXT,
  message_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities (timeline)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_lead ON activities(lead_id);
CREATE INDEX idx_activities_org ON activities(organization_id);

-- Calls
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  call_sid TEXT,
  conference_sid TEXT,
  status call_status NOT NULL DEFAULT 'initiated',
  outcome call_outcome DEFAULT 'pending',
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_lead ON calls(lead_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES profiles(id),
  channel message_channel NOT NULL,
  body TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'pending',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-up templates
CREATE TABLE followup_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  channel followup_type NOT NULL DEFAULT 'whatsapp',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  type followup_type NOT NULL DEFAULT 'whatsapp',
  status followup_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  template_id UUID REFERENCES followup_templates(id),
  message_body TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_due ON followups(scheduled_at) WHERE status = 'pending';

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude DOUBLE PRECISION,
  check_in_longitude DOUBLE PRECISION,
  check_out_latitude DOUBLE PRECISION,
  check_out_longitude DOUBLE PRECISION,
  check_in_selfie_url TEXT,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  field_visit_notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_attendance_org_date ON attendance(organization_id, date);

-- Social posts
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  post_type social_post_type NOT NULL,
  caption TEXT,
  media_urls TEXT[],
  status social_post_status NOT NULL DEFAULT 'idea',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration settings (encrypted secrets stored as text; use env vars in prod)
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  whatsapp_sender_number TEXT,
  resend_api_key TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  webhook_secret TEXT,
  openai_api_key TEXT,
  openai_base_url TEXT DEFAULT 'https://api.openai.com/v1',
  assignment_mode assignment_mode NOT NULL DEFAULT 'round_robin',
  social_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER followups_updated_at BEFORE UPDATE ON followups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER social_posts_updated_at BEFORE UPDATE ON social_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integration_settings_updated_at BEFORE UPDATE ON integration_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Helper: get user's organization
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_property_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization" ON organizations
  FOR UPDATE USING (
    id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Profiles policies
CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (
    organization_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'sales_manager'))
  );

-- Leads policies
CREATE POLICY "Org members can view leads" ON leads
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Org members can insert leads" ON leads
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Org members can update leads" ON leads
  FOR UPDATE USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can delete leads" ON leads
  FOR DELETE USING (
    organization_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_manager'))
  );

-- Properties policies
CREATE POLICY "Org members can view properties" ON properties
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Org members can manage properties" ON properties
  FOR ALL USING (organization_id = get_user_org_id());

-- Property images policies
CREATE POLICY "Org members can manage property images" ON property_images
  FOR ALL USING (organization_id = get_user_org_id());

-- Property documents policies
CREATE POLICY "Org members can manage property documents" ON property_documents
  FOR ALL USING (organization_id = get_user_org_id());

-- Lead property shares
CREATE POLICY "Org members can manage shares" ON lead_property_shares
  FOR ALL USING (organization_id = get_user_org_id());

-- Activities
CREATE POLICY "Org members can view activities" ON activities
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Org members can insert activities" ON activities
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

-- Calls
CREATE POLICY "Org members can view calls" ON calls
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Org members can manage calls" ON calls
  FOR ALL USING (organization_id = get_user_org_id());

-- Messages
CREATE POLICY "Org members can manage messages" ON messages
  FOR ALL USING (organization_id = get_user_org_id());

-- Follow-up templates
CREATE POLICY "Org members can manage templates" ON followup_templates
  FOR ALL USING (organization_id = get_user_org_id());

-- Follow-ups
CREATE POLICY "Org members can manage followups" ON followups
  FOR ALL USING (organization_id = get_user_org_id());

-- Attendance
CREATE POLICY "Users can view org attendance" ON attendance
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Users can manage own attendance" ON attendance
  FOR ALL USING (user_id = auth.uid() OR organization_id = get_user_org_id());

-- Social posts
CREATE POLICY "Org members can manage social posts" ON social_posts
  FOR ALL USING (organization_id = get_user_org_id());

-- Tasks
CREATE POLICY "Org members can manage tasks" ON tasks
  FOR ALL USING (organization_id = get_user_org_id());

-- Integration settings (admin only)
CREATE POLICY "Admins can manage integrations" ON integration_settings
  FOR ALL USING (
    organization_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());

-- Team invitations
CREATE POLICY "Admins can manage invitations" ON team_invitations
  FOR ALL USING (
    organization_id = get_user_org_id() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Public property share (no auth required via share_token)
CREATE POLICY "Public can view shared properties" ON properties
  FOR SELECT USING (share_token IS NOT NULL);

-- Service role bypass for webhooks (use service role key in API routes)
