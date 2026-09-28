// Authenticated gateway to the n8n webhooks. The browser never learns the n8n URLs:
// it calls this function with its Supabase session, and this function forwards the
// request with a shared secret header that the n8n Webhook nodes require (Header Auth).
import { assertOutreachAllowed, authenticate, corsHeaders, HttpError, json, requireEnv, serve } from '../_shared/http.ts';

type Route = { env: string; method: 'GET' | 'POST'; adminOnly?: boolean };

const ROUTES: Record<string, Route> = {
  search: { env: 'N8N_SEARCH_URL', method: 'POST' },
  // Sends a paid Meta WhatsApp template, so it is limited to the admin allowlist.
  send: { env: 'N8N_SEND_URL', method: 'POST', adminOnly: true },
  jobs: { env: 'N8N_JOBS_URL', method: 'POST' },
  people: { env: 'N8N_PEOPLE_URL', method: 'POST' },
  usage: { env: 'N8N_USAGE_URL', method: 'GET' },
  lead_usage: { env: 'N8N_LEAD_USAGE_URL', method: 'GET' },
};

/** Stay under the Edge Function wall-clock limit (150s on the free plan). */
const UPSTREAM_TIMEOUT_MS = 140_000;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const NGROK_HOST = /^https?:\/\/[^/]*\.ngrok(-free)?\.(app|dev|io)(:\d+)?\//i;

serve(async (req) => {
  const { user } = await authenticate(req);

  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD_BYTES) throw new HttpError(413, 'Request is too large.');
  let body: { action?: unknown; payload?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch { /* handled below */ }

  const action = typeof body?.action === 'string' ? body.action : '';
  const route = Object.hasOwn(ROUTES, action) ? ROUTES[action] : null;
  if (!route) throw new HttpError(400, 'Unknown action.');
  if (route.adminOnly) assertOutreachAllowed(user);

  const payload = body?.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};
  const url = requireEnv(route.env);
  const headers: Record<string, string> = { 'X-Webhook-Secret': requireEnv('N8N_WEBHOOK_SECRET') };
  if (NGROK_HOST.test(url)) headers['ngrok-skip-browser-warning'] = 'true';

  let upstreamBody: string | undefined;
  if (route.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    // Identity comes from the verified session, never from the client payload.
    upstreamBody = JSON.stringify({ ...payload, user_id: user.id, user_email: user.email ?? '' });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: route.method,
      headers,
      body: upstreamBody,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    console.error('n8n request failed', action, err);
    throw new HttpError(timedOut ? 504 : 502, timedOut ? `The ${action} workflow did not respond in time.` : `Could not reach the ${action} workflow.`);
  }

  // Pass n8n's status and body through so the client keeps its existing error handling.
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    console.error('n8n rejected the webhook secret', action, res.status);
    return json({ error: 'The automation server rejected this request. Check N8N_WEBHOOK_SECRET.' }, 502);
  }
  if (res.status === 404) {
    // Keep 404 meaning "this Edge Function is missing" for the client.
    return json({ error: `The ${action} workflow is not active in n8n.` }, 502);
  }
  return new Response(text, {
    status: res.status,
    headers: { ...corsHeaders, 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
});
