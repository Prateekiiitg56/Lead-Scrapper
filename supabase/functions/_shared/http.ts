// Shared helpers for Lead-Scrapper Edge Functions (Deno runtime).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Server is missing the ${name} secret.`);
  return value;
}

/**
 * Resolve the calling user from their Supabase JWT and return a client that acts as
 * that user, so every database read/write below is subject to RLS.
 */
export async function authenticate(req: Request): Promise<{ user: User; db: SupabaseClient }> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required.');

  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.auth.getUser(authorization.slice('Bearer '.length));
  if (error || !data.user) throw new HttpError(401, 'Your session has expired. Sign in again.');
  return { user: data.user, db };
}

/** Admin allowlist (AUTHORIZED_ADMIN_EMAILS, comma-separated). Unset means nobody may send. */
export function assertOutreachAllowed(user: User) {
  const allow = (Deno.env.get('AUTHORIZED_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allow.includes((user.email ?? '').toLowerCase())) {
    throw new HttpError(403, 'Outreach is restricted to authorized admin accounts.');
  }
}

export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Unexpected server error.' }, 500);
    }
  });
}
