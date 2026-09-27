// Sends a freeform WhatsApp text (Inbox reply) through the Meta Cloud API.
// The Meta token never reaches the browser. The recipient phone is read from the
// caller's own lead (RLS), never taken from the request body.
import { assertOutreachAllowed, authenticate, HttpError, json, requireEnv, serve } from '../_shared/http.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 4096; // WhatsApp text body limit

serve(async (req) => {
  const { user, db } = await authenticate(req);
  assertOutreachAllowed(user);

  const body = await req.json().catch(() => null);
  const leadId = typeof body?.lead_id === 'string' ? body.lead_id : '';
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!UUID_RE.test(leadId)) throw new HttpError(400, 'A valid lead_id is required.');
  if (!text || text.length > MAX_TEXT) throw new HttpError(400, `Message must be 1–${MAX_TEXT} characters.`);

  const { data: lead, error: leadError } = await db.from('leads').select('id, phone').eq('id', leadId).maybeSingle();
  if (leadError) throw new HttpError(500, leadError.message);
  if (!lead) throw new HttpError(404, 'Lead not found.');

  const digits = (lead.phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) throw new HttpError(422, 'This lead has no valid phone number.');
  // Bare 10-digit numbers are Indian mobiles in this CRM's data.
  const to = digits.length === 10 ? `91${digits}` : digits;

  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${requireEnv('META_PHONE_NUMBER_ID')}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${requireEnv('META_ACCESS_TOKEN')}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } }),
  });
  const meta = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok) {
    // Most common: 131047 — more than 24h since the customer last messaged; only templates allowed.
    const message = meta?.error?.error_data?.details || meta?.error?.message || `Meta API error (HTTP ${metaRes.status}).`;
    throw new HttpError(502, message);
  }
  const wamid: string | null = meta?.messages?.[0]?.id ?? null;

  const { error: insertError } = await db.from('conversations').insert({
    lead_id: lead.id,
    direction: 'OUTBOUND',
    message: text,
    message_type: 'text',
    status: 'sent',
    wamid,
  });
  if (insertError) {
    console.error('conversation insert failed', insertError);
    return json({ ok: true, wamid, warning: 'Message sent, but it could not be saved to the conversation history.' });
  }

  await db.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', lead.id);
  return json({ ok: true, wamid });
});
