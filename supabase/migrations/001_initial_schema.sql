-- ══════════════════════════════════════════════════════════════
-- Lead-Scrapper v2 — Initial Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ENUM types
CREATE TYPE lead_status AS ENUM (
  'NEW', 'CONTACTED', 'REPLIED', 'INTERESTED',
  'FOLLOW_UP', 'MEETING_BOOKED', 'CLIENT', 'LOST'
);

CREATE TYPE message_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE message_type AS ENUM ('text', 'template', 'image', 'video', 'audio', 'document', 'location', 'reaction');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE followup_status AS ENUM ('scheduled', 'sent', 'cancelled', 'completed');

-- ═══════════════════════════════
-- Table: users
-- ═══════════════════════════════
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════
-- Table: leads
-- ═══════════════════════════════
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  phone_clean TEXT GENERATED ALWAYS AS (regexp_replace(phone, '[^0-9]', '', 'g')) STORED,
  website TEXT,
  has_website BOOLEAN DEFAULT false,
  category TEXT,
  city TEXT,
  address TEXT,
  rating NUMERIC(2,1),
  google_place_id TEXT UNIQUE,
  status lead_status DEFAULT 'NEW',
  last_contact_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  ai_summary TEXT,
  ai_intent TEXT,
  ai_sentiment TEXT,
  interest_score INTEGER DEFAULT 0 CHECK (interest_score BETWEEN 0 AND 100),
  followup_date DATE,
  assigned_user_id UUID REFERENCES users(id),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════
-- Table: conversations
-- ═══════════════════════════════
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  message TEXT,
  media_url TEXT,
  media_type TEXT,
  message_type message_type DEFAULT 'text',
  status message_status DEFAULT 'pending',
  wamid TEXT UNIQUE,
  template_name TEXT,
  ai_classification JSONB,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════
-- Table: followups
-- ═══════════════════════════════
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  template_name TEXT,
  message TEXT,
  status followup_status DEFAULT 'scheduled',
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════
-- Table: templates
-- ═══════════════════════════════
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  category TEXT,
  language TEXT DEFAULT 'en',
  body_text TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  meta_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════
-- Table: analytics
-- ═══════════════════════════════
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  clients_converted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date)
);


-- ══════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════
CREATE INDEX idx_leads_phone_clean ON leads(phone_clean);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_followup_date ON leads(followup_date);
CREATE INDEX idx_leads_assigned_user ON leads(assigned_user_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX idx_conversations_wamid ON conversations(wamid);
CREATE INDEX idx_conversations_direction ON conversations(direction);

CREATE INDEX idx_followups_lead_id ON followups(lead_id);
CREATE INDEX idx_followups_scheduled ON followups(scheduled_at) WHERE status = 'scheduled';

CREATE INDEX idx_analytics_date ON analytics(date DESC);


-- ══════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access (single-tenant v1)
CREATE POLICY "auth_full_access" ON leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_full_access" ON conversations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_full_access" ON followups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_full_access" ON templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_full_access" ON analytics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_full_access" ON users FOR ALL USING (auth.role() = 'authenticated');

-- Service role bypass (for n8n webhook inserts via service_role key)
CREATE POLICY "service_bypass" ON leads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_bypass" ON conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_bypass" ON followups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_bypass" ON analytics FOR ALL USING (auth.role() = 'service_role');


-- ══════════════════════════════════════════
-- Auto-update timestamps trigger
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ══════════════════════════════════════════
-- Enable Realtime for key tables
-- ══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
