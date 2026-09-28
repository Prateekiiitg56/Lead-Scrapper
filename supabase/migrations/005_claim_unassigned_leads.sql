-- ══════════════════════════════════════════════════════════════
-- Migration 005: Let a user claim an unowned lead
-- Run in Supabase SQL Editor (Dashboard → SQL Editor). Requires migration 002.
--
-- The n8n send workflow used to insert leads with the service-role key and no
-- assigned_user_id. RLS hides those rows from every user, but their phone/email
-- still hold the unique indexes, so the user's own CRM save failed with
-- "This business already exists in the database but is not assigned to your account".
-- This function assigns such an orphan row to the caller. Rows owned by another
-- user are never touched.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION claim_unassigned_lead(p_phone_clean TEXT, p_email TEXT)
RETURNS SETOF leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE leads
  SET assigned_user_id = auth.uid()
  WHERE assigned_user_id IS NULL
    AND auth.uid() IS NOT NULL
    AND (
      (NULLIF(p_phone_clean, '') IS NOT NULL AND phone_clean = p_phone_clean)
      OR (NULLIF(p_email, '') IS NOT NULL AND lower(email) = lower(p_email))
    )
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION claim_unassigned_lead(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_unassigned_lead(TEXT, TEXT) TO authenticated;
