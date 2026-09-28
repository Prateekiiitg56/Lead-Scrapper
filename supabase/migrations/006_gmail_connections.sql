-- ══════════════════════════════════════════════════════════════
-- Migration 006: Per-user Gmail sending
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Cold emails are sent from the signed-in user's own Gmail account through the
-- `gmail` Edge Function. It stores each user's Google refresh token here,
-- encrypted with the GMAIL_TOKEN_KEY secret. RLS is enabled with no policies,
-- so browsers can never read or write this table; only the Edge Function
-- (service role) can.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gmail_connections FROM anon, authenticated;
