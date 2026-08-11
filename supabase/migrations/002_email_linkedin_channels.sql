-- ══════════════════════════════════════════════════════════════
-- Migration 002: Email & LinkedIn multi-channel support
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ─── Add email & linkedin_url columns to leads ───
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- ─── Case-insensitive unique index on email (needed for onConflict: 'email' upserts) ───
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_lower
  ON leads (lower(email))
  WHERE email IS NOT NULL;

-- ─── Extend message_type enum with 'email' and 'linkedin' values ───
-- ALTER TYPE ... ADD VALUE is not idempotent by default, so we guard with pg_enum checks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'message_type'::regtype AND enumlabel = 'email'
  ) THEN
    ALTER TYPE message_type ADD VALUE 'email';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'message_type'::regtype AND enumlabel = 'linkedin'
  ) THEN
    ALTER TYPE message_type ADD VALUE 'linkedin';
  END IF;
END
$$;

-- ─── Seed template rows for email & LinkedIn outreach ───
INSERT INTO templates (name, display_name, category, language, body_text, is_active)
VALUES
  ('website_pitch_email', 'Website Pitch (Email)', 'email', 'en',
   'Hi {{business_name}}, I noticed your website at {{website}} and wanted to share how we can help automate your business processes with AI-powered solutions.',
   true),
  ('automation_pitch_email', 'Automation / AI Pitch (Email)', 'email', 'en',
   'Hi {{business_name}}, we specialize in building custom AI automations for businesses like yours at {{address}}. Would you be open to a quick chat about streamlining your operations?',
   true),
  ('first_outreach_email', 'General First Outreach (Email)', 'email', 'en',
   'Hello {{business_name}}, we came across your business listing and wanted to connect about how our services could help grow your business.',
   true),
  ('linkedin_first_touch', 'LinkedIn First Touch', 'linkedin', 'en',
   'Hi, I came across {{business_name}} and would love to connect. We help businesses like yours leverage AI and automation for growth.',
   true)
ON CONFLICT (name) DO NOTHING;
