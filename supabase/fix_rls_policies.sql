-- ═════════════════════════════════════════════════════════════════════
-- Supabase Schema Fix & RLS Policies for Multi-Tenant Lead-Scrapper
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═════════════════════════════════════════════════════════════════════

-- 1. Fix Foreign Key constraint on leads.assigned_user_id to reference auth.users(id)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_assigned_user_id_fkey;
ALTER TABLE leads ADD CONSTRAINT leads_assigned_user_id_fkey 
  FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Sync registered Supabase Auth users into public.users table
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Assign all existing unassigned historical leads to main admin (ps332927@gmail.com)
UPDATE leads
SET assigned_user_id = (SELECT id FROM auth.users WHERE email = 'ps332927@gmail.com' LIMIT 1)
WHERE assigned_user_id IS NULL;

-- 4. Clean up old permissive policies
DROP POLICY IF EXISTS "anon_full_access" ON leads;
DROP POLICY IF EXISTS "anon_full_access" ON conversations;
DROP POLICY IF EXISTS "anon_full_access" ON followups;
DROP POLICY IF EXISTS "anon_full_access" ON templates;
DROP POLICY IF EXISTS "anon_full_access" ON analytics;
DROP POLICY IF EXISTS "auth_full_access" ON leads;
DROP POLICY IF EXISTS "auth_full_access" ON conversations;
DROP POLICY IF EXISTS "user_leads_policy" ON leads;
DROP POLICY IF EXISTS "user_conversations_policy" ON conversations;
DROP POLICY IF EXISTS "service_role_leads" ON leads;
DROP POLICY IF EXISTS "service_role_conversations" ON conversations;

-- 5. Enable Row Level Security on all CRM tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- 6. User Leads Policy: Users can access and manage leads assigned to their auth.uid()
CREATE POLICY "user_leads_policy" ON leads FOR ALL
  USING (assigned_user_id = auth.uid())
  WITH CHECK (assigned_user_id = auth.uid());

-- 7. User Conversations Policy: Users can access conversations for leads assigned to their auth.uid()
CREATE POLICY "user_conversations_policy" ON conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.assigned_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = conversations.lead_id
      AND leads.assigned_user_id = auth.uid()
    )
  );

-- 8. Service role bypass (for background n8n webhooks)
CREATE POLICY "service_role_leads" ON leads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_conversations" ON conversations FOR ALL USING (auth.role() = 'service_role');



