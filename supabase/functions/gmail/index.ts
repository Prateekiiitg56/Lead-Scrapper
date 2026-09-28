// Sends cold emails from the signed-in user's own Gmail account.
//
// The user grants the gmail.send scope during Google sign-in (or "Connect Gmail").
// The browser hands the Google refresh token to `connect` once; it is stored encrypted
// in gmail_connections and never returned. `send` exchanges it for a short-lived access
// token and calls the Gmail API. The Google account must be the one the user signed in with.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { authenticate, HttpError, json, requireEnv, serve } from '../_shared/http.ts';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const MAX_SUBJECT = 300;
const MAX_BODY = 20_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Not connected, expired or revoked: the client shows "Connect Gmail". */
function notConnected(message: string): Response {
  return json({ error: message, code: 'gmail_not_connected' }, 409);
}

function admin() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/* ── Encoding ── */

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/* ── Refresh-token encryption (AES-GCM, key derived from GMAIL_TOKEN_KEY) ── */

async function tokenKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', utf8(requireEnv('GMAIL_TOKEN_KEY')));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await tokenKey(), utf8(plain)));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return bytesToBase64(out);
}

async function decrypt(stored: string): Promise<string> {
  const bytes = base64ToBytes(stored);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, await tokenKey(), bytes.subarray(12));
  return new TextDecoder().decode(plain);
}

/* ── Google ── */

class GrantRevoked extends Error {}

async function accessTokenFor(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (data?.error === 'invalid_grant') throw new GrantRevoked();
  if (!res.ok || typeof data?.access_token !== 'string') {
    console.error('google token error', res.status, data?.error, data?.error_description);
    throw new HttpError(502, 'Google did not issue an access token. Check GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
  }
  return data.access_token;
}

async function tokenInfo(accessToken: string): Promise<{ email: string; scopes: string[] }> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, 'Could not verify the Google account.');
  return { email: String(data.email ?? '').toLowerCase(), scopes: String(data.scope ?? '').split(' ') };
}

/** RFC 2047 encoded-word, so non-ASCII subjects and names survive. */
function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${bytesToBase64(utf8(value))}?=`;
}

function buildMime(from: { email: string; name: string }, to: string, subject: string, body: string): string {
  const fromHeader = from.name ? `${encodeHeader(from.name.replace(/["\r\n]/g, ''))} <${from.email}>` : from.email;
  const encodedBody = bytesToBase64(utf8(body.replace(/\r?\n/g, '\r\n'))).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody,
  ].join('\r\n');
}

const toBase64Url = (s: string) => bytesToBase64(utf8(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ── Handler ── */

serve(async (req) => {
  const { user } = await authenticate(req);
  const body = await req.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';
  const db = admin();
  const loginEmail = (user.email ?? '').toLowerCase();

  if (action === 'status') {
    const { data, error } = await db.from('gmail_connections').select('google_email').eq('user_id', user.id).maybeSingle();
    if (error) throw new HttpError(500, error.message);
    return json({ connected: !!data, email: data?.google_email ?? null });
  }

  if (action === 'connect') {
    const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token.trim() : '';
    if (!refreshToken || refreshToken.length > 2048) throw new HttpError(400, 'A Google refresh token is required.');
    let info;
    try {
      info = await tokenInfo(await accessTokenFor(refreshToken));
    } catch (err) {
      if (err instanceof GrantRevoked) return notConnected('Google rejected the grant. Connect Gmail again.');
      throw err;
    }
    if (!info.scopes.includes(GMAIL_SEND_SCOPE)) {
      return notConnected('Gmail send permission was not granted. Connect Gmail again and allow "Send email on your behalf".');
    }
    if (!loginEmail || info.email !== loginEmail) {
      return notConnected(`Connect the Google account you signed in with (${user.email}), not ${info.email || 'another account'}.`);
    }
    const { error } = await db.from('gmail_connections').upsert({
      user_id: user.id,
      google_email: info.email,
      refresh_token_encrypted: await encrypt(refreshToken),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new HttpError(500, error.message);
    return json({ connected: true, email: info.email });
  }

  if (action === 'send') {
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!EMAIL_RE.test(to) || /[\r\n,;<>]/.test(to)) throw new HttpError(400, 'Enter one valid recipient email address.');
    if (!subject || subject.length > MAX_SUBJECT || /[\r\n]/.test(subject)) throw new HttpError(400, `Subject must be one line of 1–${MAX_SUBJECT} characters.`);
    if (!text || text.length > MAX_BODY) throw new HttpError(400, `Message must be 1–${MAX_BODY} characters.`);

    const { data: conn, error } = await db
      .from('gmail_connections')
      .select('google_email, refresh_token_encrypted')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!conn) return notConnected('Connect your Gmail account to send email.');
    if (conn.google_email !== loginEmail) {
      await db.from('gmail_connections').delete().eq('user_id', user.id);
      return notConnected('Your connected Gmail no longer matches your sign-in email. Connect Gmail again.');
    }

    let accessToken: string;
    try {
      accessToken = await accessTokenFor(await decrypt(conn.refresh_token_encrypted));
    } catch (err) {
      if (!(err instanceof GrantRevoked)) throw err;
      await db.from('gmail_connections').delete().eq('user_id', user.id);
      return notConnected('Gmail access expired or was revoked. Connect Gmail again.');
    }

    const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ raw: toBase64Url(buildMime({ email: conn.google_email, name }, to, subject, text)) }),
    });
    const sent = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('gmail send error', res.status, sent?.error?.message);
      if (res.status === 401 || res.status === 403) {
        return notConnected('Gmail refused to send. Connect Gmail again and allow sending.');
      }
      throw new HttpError(502, sent?.error?.message || `Gmail send failed (HTTP ${res.status}).`);
    }
    return json({ ok: true, id: sent.id ?? null, from: conn.google_email });
  }

  throw new HttpError(400, 'Unknown action.');
});
