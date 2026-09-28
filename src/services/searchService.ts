import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import { isOutreachAuthorized } from '@/services/permissionService';
import { normalizePhone, recordOutreach } from '@/services/leadService';
import type { ApiUsage, ApiUsageSource, SearchLead, StatsResponse } from '@/types/api';
import type { EmailTemplateId } from '@/lib/constants';
import type { Lead } from '@/types/database';

const WEBHOOKS = {
  search: import.meta.env.VITE_N8N_SEARCH_URL || '',
  send: import.meta.env.VITE_N8N_SEND_URL || '',
  stats: import.meta.env.VITE_N8N_STATS_URL || '',
  email: import.meta.env.VITE_N8N_EMAIL_URL || '',
  jobs: import.meta.env.VITE_N8N_JOBS_URL || '',
  people: import.meta.env.VITE_N8N_PEOPLE_URL || '',
  usage: import.meta.env.VITE_N8N_USAGE_URL || '',
};

/** Google Places + detail lookups + website scraping in n8n routinely take 30–60s. */
const SEARCH_TIMEOUT_MS = 120_000;
const SEND_TIMEOUT_MS = 45_000;

export type WebhookErrorKind = 'config' | 'timeout' | 'network' | 'http' | 'malformed' | 'rejected';

export class WebhookError extends Error {
  readonly kind: WebhookErrorKind;
  constructor(kind: WebhookErrorKind, message: string) {
    super(message);
    this.name = 'WebhookError';
    this.kind = kind;
  }
}

export class PermissionError extends Error {
  constructor() {
    super('Outreach is restricted to authorized admin accounts.');
    this.name = 'PermissionError';
  }
}

const NGROK_HOST = /^https?:\/\/[^/]*\.ngrok(-free)?\.(app|dev|io)(:\d+)?\//i;

export async function callWebhook(
  name: keyof typeof WEBHOOKS,
  init: { method: 'GET' | 'POST'; body?: unknown },
  timeoutMs: number
): Promise<unknown> {
  const url = WEBHOOKS[name];
  if (!url) throw new WebhookError('config', `The ${name} webhook is not configured (VITE_N8N_${name.toUpperCase()}_URL).`);

  const headers: Record<string, string> = {};
  if (init.body) headers['Content-Type'] = 'application/json';
  // ngrok's free tunnels answer browsers with an HTML warning page (no CORS headers) unless told to skip it.
  if (NGROK_HOST.test(url)) headers['ngrok-skip-browser-warning'] = 'true';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new WebhookError('timeout', `The ${name} service did not respond within ${Math.round(timeoutMs / 1000)}s. Try again.`);
    }
    throw new WebhookError('network', `Could not reach the ${name} service. Check your connection or the n8n instance. (${(err as Error).message})`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new WebhookError('malformed', `The ${name} service returned an invalid response (HTTP ${res.status}).`);
    }
  }

  if (!res.ok) {
    const msg = (json as { message?: string } | null)?.message;
    throw new WebhookError('http', msg || `The ${name} service failed with HTTP ${res.status}.`);
  }
  if (json === null) {
    throw new WebhookError('malformed', `The ${name} service returned an empty response. The workflow may have stopped before replying.`);
  }
  return json;
}

export function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

/** Coerce one raw n8n lead into a SearchLead, or null when it has no usable name. */
function normalizeSearchLead(raw: unknown, city: string | null): SearchLead | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name ?? r.business_name);
  if (!name) return null;
  const website = asString(r.website);
  const hasWebsiteFlag = asString(r.has_website).toLowerCase();
  const rating = Number.parseFloat(asString(r.rating));
  return {
    name,
    phone: asString(r.phone),
    address: asString(r.address),
    rating: Number.isFinite(rating) ? rating : null,
    has_website: hasWebsiteFlag ? hasWebsiteFlag === 'true' : !!website,
    website,
    place_id: asString(r.place_id ?? r.google_place_id) || null,
    email: asString(r.email) || null,
    linkedin_url: asString(r.linkedin_url) || null,
    city,
  };
}

export interface SearchResult {
  leads: SearchLead[];
  /** Rows dropped because they repeated a phone/place already in the results. */
  duplicates: number;
  /** Rows dropped because they had no business name. */
  invalid: number;
}

/** Call the n8n Google Places search webhook, validating and de-duplicating the response. */
export async function searchLeads(businessType: string, businessTypeOther: string, location: string): Promise<SearchResult> {
  const json = await callWebhook(
    'search',
    { method: 'POST', body: { business_type: businessType, business_type_other: businessTypeOther, location } },
    SEARCH_TIMEOUT_MS
  );

  const body = json as { success?: unknown; message?: unknown; leads?: unknown };
  const rawLeads = Array.isArray(json) ? json : body.leads;
  if (!Array.isArray(json) && body.success === false) {
    throw new WebhookError('rejected', asString(body.message) || 'The search workflow reported a failure.');
  }
  if (!Array.isArray(rawLeads)) {
    throw new WebhookError('malformed', 'The search service response did not contain a leads list.');
  }

  const city = location.split(',')[0].trim() || null;
  const seen = new Set<string>();
  const leads: SearchLead[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const raw of rawLeads) {
    const lead = normalizeSearchLead(raw, city);
    if (!lead) { invalid++; continue; }
    const key = lead.place_id || normalizePhone(lead.phone) || `${lead.name}|${lead.address}`.toLowerCase();
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    leads.push(lead);
  }
  return { leads, duplicates, invalid };
}

export type WhatsAppTemplate = 'website_automation_pitch_v2' | 'first_outreach';

export interface OutreachResult {
  lead: Lead | null;
  /** Set when the message was sent but the CRM record could not be saved. */
  crmError: string | null;
}

function searchLeadToInput(lead: SearchLead, category?: string) {
  return {
    business_name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    website: lead.website,
    rating: lead.rating,
    category: category || null,
    city: lead.city,
    linkedin_url: lead.linkedin_url,
  };
}

async function recordAfterSend(
  userId: string,
  input: Parameters<typeof recordOutreach>[1],
  conversation: Parameters<typeof recordOutreach>[2]
): Promise<OutreachResult> {
  try {
    return { lead: await recordOutreach(userId, input, conversation), crmError: null };
  } catch (err) {
    return { lead: null, crmError: errorMessage(err, 'Could not update the CRM.') };
  }
}

/** Dispatch a Meta-approved WhatsApp template through n8n, then log it in the user's CRM. */
export async function sendWhatsAppTemplate(
  lead: SearchLead,
  template: WhatsAppTemplate,
  user: { id: string; email?: string | null },
  category?: string
): Promise<OutreachResult> {
  if (!isOutreachAuthorized(user.email)) throw new PermissionError();
  const phone = normalizePhone(lead.phone);
  if (!phone) throw new WebhookError('config', 'This lead has no valid phone number for WhatsApp.');

  const json = (await callWebhook(
    'send',
    {
      method: 'POST',
      body: { name: lead.name, phone, address: lead.address, website: lead.website || '', template_name: template, user_id: user.id },
    },
    SEND_TIMEOUT_MS
  )) as { success?: unknown; message?: unknown };

  if (json.success !== true) {
    throw new WebhookError('rejected', asString(json.message) || 'WhatsApp dispatch was not confirmed by the server.');
  }

  return recordAfterSend(user.id, searchLeadToInput(lead, category), {
    message: template === 'website_automation_pitch_v2' ? 'Website automation pitch (template)' : 'First outreach (template)',
    message_type: 'template',
    template_name: template,
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Send a cold email through the n8n Gmail webhook, then log it in the user's CRM. */
export async function sendColdEmail(opts: {
  lead: SearchLead;
  toEmail: string;
  templateId: EmailTemplateId;
  subject?: string;
  body?: string;
  businessType?: string;
  user: { id: string; email?: string | null };
}): Promise<OutreachResult> {
  const toEmail = opts.toEmail.trim();
  if (!isValidEmail(toEmail)) throw new WebhookError('config', 'Enter a valid recipient email address.');

  const json = (await callWebhook(
    'email',
    {
      method: 'POST',
      body: {
        to_email: toEmail,
        from_email: opts.user.email || '',
        business_name: opts.lead.name,
        address: opts.lead.address,
        website: opts.lead.website || '',
        template_id: opts.templateId,
        subject: opts.subject || '',
        custom_body: opts.body || '',
        business_type: opts.businessType || '',
        user_id: opts.user.id,
      },
    },
    SEND_TIMEOUT_MS
  )) as { success?: unknown; message?: unknown };

  if (json.success !== true) {
    throw new WebhookError('rejected', asString(json.message) || 'Email dispatch was not confirmed by the server.');
  }

  return recordAfterSend(
    opts.user.id,
    { ...searchLeadToInput(opts.lead, opts.businessType), email: toEmail },
    { message: opts.body || `Email template sent: ${opts.templateId}`, message_type: 'email', template_name: opts.templateId }
  );
}

/** Pull the `{ error }` message out of a failed Edge Function call. */
async function edgeFunctionError(error: unknown, fallback: string, fn: string): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    let body: { error?: string; message?: string } | null = null;
    try {
      body = await res.json();
    } catch { /* not JSON */ }
    if (body?.error) return new Error(body.error);
    if (res.status === 404) {
      return new Error(`This feature needs the "${fn}" Supabase Edge Function, which is not deployed. See README → Edge Functions.`);
    }
    if (body?.message) return new Error(body.message);
    return new Error(`${fallback} (HTTP ${res.status})`);
  }
  return new Error(error instanceof Error && error.message ? error.message : fallback);
}

/** Draft a personalized cold email. Gemini runs server-side in the `ai-email-draft` Edge Function. */
export async function generateAIEmail(opts: {
  businessName: string;
  businessType: string;
  address: string;
  website?: string;
}): Promise<{ subject: string; body: string }> {
  const { data, error } = await supabase.functions.invoke('ai-email-draft', { body: opts });
  if (error) throw await edgeFunctionError(error, 'AI drafting failed.', 'ai-email-draft');
  if (!data?.body || typeof data.body !== 'string') throw new Error('AI drafting returned an empty draft. Try again.');
  return { subject: String(data.subject || `Quick question for ${opts.businessName}`), body: data.body };
}

/**
 * Send a freeform WhatsApp reply from the Inbox. The `whatsapp-send-text` Edge Function
 * holds the Meta token, reads the phone from the user's own lead, and logs the message.
 */
export async function sendInboxReply(leadId: string, text: string): Promise<{ warning: string | null }> {
  const { data, error } = await supabase.functions.invoke('whatsapp-send-text', { body: { lead_id: leadId, text } });
  if (error) throw await edgeFunctionError(error, 'WhatsApp reply failed.', 'whatsapp-send-text');
  return { warning: typeof data?.warning === 'string' ? data.warning : null };
}

/** Outreach counters from the n8n stats webhook (Google Sheets log). */
export async function fetchStats(): Promise<StatsResponse> {
  const json = (await callWebhook('stats', { method: 'GET' }, SEND_TIMEOUT_MS)) as Record<string, unknown>;
  const sent = Number(json.sent_this_month);
  const total = Number(json.total_logged);
  if (!Number.isFinite(sent) || !Number.isFinite(total)) {
    throw new WebhookError('malformed', 'The stats service returned an unexpected response.');
  }
  return { success: true, sent_this_month: sent, total_logged: total };
}

/** Today's third-party API calls, counted by the Job Signals workflow in n8n. */
export async function fetchApiUsage(): Promise<ApiUsage> {
  const json = (await callWebhook('usage', { method: 'GET' }, SEND_TIMEOUT_MS)) as Record<string, unknown>;
  if (!Array.isArray(json.sources)) {
    throw new WebhookError('malformed', 'The usage service returned an unexpected response.');
  }
  const sources: ApiUsageSource[] = json.sources.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const limit = Number(r.daily_limit);
    return {
      name: asString(r.name),
      calls: Number(r.calls) || 0,
      daily_limit: r.daily_limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
      note: asString(r.note),
    };
  });
  return { reset_at: asString(json.reset_at) || null, sources: sources.filter((src) => src.name) };
}
