-- ══════════════════════════════════════════════════════════════
-- Migration 003: tighten RLS left permissive by 001
-- Run in Supabase SQL Editor after 001, 002 and fix_rls_policies.sql.
-- ══════════════════════════════════════════════════════════════

-- 001 granted every authenticated user full read/write on public.users
-- (all profiles and emails). Restrict each user to their own row.
DROP POLICY IF EXISTS "auth_full_access" ON users;
DROP POLICY IF EXISTS "users_self_access" ON users;
CREATE POLICY "users_self_access" ON users FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- followups belong to a lead; scope them to the lead owner like conversations.
DROP POLICY IF EXISTS "auth_full_access" ON followups;
DROP POLICY IF EXISTS "user_followups_policy" ON followups;
CREATE POLICY "user_followups_policy" ON followups FOR ALL
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = followups.lead_id AND leads.assigned_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM leads WHERE leads.id = followups.lead_id AND leads.assigned_user_id = auth.uid()));

-- templates are shared, read-only reference data for signed-in users.
DROP POLICY IF EXISTS "auth_full_access" ON templates;
DROP POLICY IF EXISTS "templates_read" ON templates;
CREATE POLICY "templates_read" ON templates FOR SELECT USING (auth.role() = 'authenticated');

-- analytics is aggregate data written by n8n (service role); read-only for users.
DROP POLICY IF EXISTS "auth_full_access" ON analytics;
DROP POLICY IF EXISTS "analytics_read" ON analytics;
CREATE POLICY "analytics_read" ON analytics FOR SELECT USING (auth.role() = 'authenticated');
