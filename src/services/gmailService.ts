import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { EdgeFunctionError, edgeFunctionError } from '@/services/edgeFunction';

/**
 * Google OAuth options that grant Gmail sending. `offline` + `consent` makes Google return a
 * refresh token every time, which the `gmail` Edge Function stores so sending keeps working.
 */
export const GMAIL_OAUTH_OPTIONS = {
  scopes: 'https://www.googleapis.com/auth/gmail.send',
  queryParams: { access_type: 'offline', prompt: 'consent' },
};

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  /** Why the last connect attempt failed (e.g. a different Google account was chosen). */
  error?: string;
}

async function invokeGmail<T>(body: Record<string, unknown>, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('gmail', { body });
  if (error) throw await edgeFunctionError(error, fallback, 'gmail');
  return data as T;
}

export function isGmailNotConnected(err: unknown): boolean {
  return err instanceof EdgeFunctionError && err.code === 'gmail_not_connected';
}

export function fetchGmailStatus(): Promise<GmailStatus> {
  return invokeGmail<GmailStatus>({ action: 'status' }, 'Could not check the Gmail connection.');
}

/** Hand the Google refresh token from the OAuth redirect to the server, which verifies and stores it. */
export function saveGmailGrant(refreshToken: string): Promise<GmailStatus> {
  return invokeGmail<GmailStatus>({ action: 'connect', refresh_token: refreshToken }, 'Could not connect Gmail.');
}

/** Send one plain-text email from the signed-in user's Gmail account. */
export function sendGmail(msg: { to: string; subject: string; body: string }): Promise<{ id: string | null; from: string }> {
  return invokeGmail({ action: 'send', ...msg }, 'Email could not be sent.');
}

/**
 * Start Google OAuth with the Gmail send scope and come back to this page. Google sign-in
 * users re-consent on their existing identity; email/password users link Google to their
 * account (requires "Manual linking" in Supabase Auth settings).
 */
export async function startGmailConnect(user: User): Promise<Error | null> {
  const redirectTo = window.location.href;
  const hasGoogle = user.identities?.some((i) => i.provider === 'google');
  const { error } = hasGoogle
    ? await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { ...GMAIL_OAUTH_OPTIONS, redirectTo, queryParams: { ...GMAIL_OAUTH_OPTIONS.queryParams, login_hint: user.email ?? '' } },
      })
    : await supabase.auth.linkIdentity({ provider: 'google', options: { ...GMAIL_OAUTH_OPTIONS, redirectTo } });
  return error;
}
