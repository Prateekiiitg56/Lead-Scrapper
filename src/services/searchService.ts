import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import { isOutreachAuthorized } from '@/services/permissionService';
import { edgeFunctionError } from '@/services/edgeFunction';
import { sendGmail } from '@/services/gmailService';
import { normalizePhone, recordOutreach } from '@/services/leadService';
import type { ApiUsage, ApiUsageSource, SearchLead } from '@/types/api';
import type { EmailTemplateId } from '@/lib/constants';
import type { Lead } from '@/types/database';

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

/** n8n workflows reachable through the `n8n-proxy` Edge Function. */
export type WebhookName = 'search' | 'send' | 'jobs' | 'people' | 'usage' | 'lead_usage';

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-proxy`;

/**
 * Call an n8n workflow. Requests go through the `n8n-proxy` Edge Function, which checks the
 * Supabase session (and the admin allowlist for sends) and holds the n8n URLs and secret.
 */
export async function callWebhook(
  name: WebhookName,
  init: { method: 'GET' | 'POST'; body?: unknown },
  timeoutMs: number
): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new WebhookError('config', 'Your session has expired. Sign in again.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: name, payload: init.body ?? {} }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new WebhookError('timeout', `The ${name} service did not respond within ${Math.round(timeoutMs / 1000)}s. Try again.`);
    }
    throw new WebhookError('network', `Could not reach the ${name} service. Check your connection, and that the n8n-proxy Edge Function is deployed. (${(err as Error).message})`);
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
    const { error, message } = (json ?? {}) as { error?: string; message?: string };
    if (res.status === 403) throw new PermissionError();
    if (res.status === 404 && !error) {
      throw new WebhookError('config', 'The "n8n-proxy" Supabase Edge Function is not deployed. See README → Edge Functions.');
    }
    throw new WebhookError('http', error || message || `The ${name} service failed with HTTP ${res.status}.`);
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
  const hasWebsiteFlag = asString(typeof r.has_website === 'boolean' ? String(r.has_website) : r.has_website).toLowerCase();
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
  /** When n8n fetched these Places results, if it answered from its cache; null when fresh. */
  cachedAt: string | null;
}

/** Call the n8n Google Places search webhook, validating and de-duplicating the response. */
export async function searchLeads(businessType: string, businessTypeOther: string, location: string): Promise<SearchResult> {
  const json = await callWebhook(
    'search',
    { method: 'POST', body: { business_type: businessType, business_type_other: businessTypeOther, location } },
    SEARCH_TIMEOUT_MS
  );

  const body = json as { success?: unknown; message?: unknown; leads?: unknown; cached_at?: unknown };
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
  return { leads, duplicates, invalid, cachedAt: asString(body.cached_at) || null };
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
  )) as { success?: unknown; message?: unknown; wamid?: unknown };

  if (json.success !== true) {
    throw new WebhookError('rejected', asString(json.message) || 'WhatsApp dispatch was not confirmed by the server.');
  }

  return recordAfterSend(user.id, searchLeadToInput(lead, category), {
    message: template === 'website_automation_pitch_v2' ? 'Website automation pitch (template)' : 'First outreach (template)',
    message_type: 'template',
    template_name: template,
    wamid: asString(json.wamid) || null,
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Send a cold email from the signed-in user's own Gmail, then log it in their CRM. */
export async function sendColdEmail(opts: {
  lead: SearchLead;
  toEmail: string;
  templateId: EmailTemplateId;
  subject: string;
  body: string;
  businessType?: string;
  user: { id: string };
}): Promise<OutreachResult> {
  const toEmail = opts.toEmail.trim();
  if (!isValidEmail(toEmail)) throw new WebhookError('config', 'Enter a valid recipient email address.');
  if (!opts.subject.trim() || !opts.body.trim()) throw new WebhookError('config', 'Add a subject and a message.');

  await sendGmail({ to: toEmail, subject: opts.subject.trim(), body: opts.body.trim() });

  return recordAfterSend(
    opts.user.id,
    { ...searchLeadToInput(opts.lead, opts.businessType), email: toEmail },
    { message: `${opts.subject.trim()}

${opts.body.trim()}`, message_type: 'email', template_name: opts.templateId }
  );
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

/** One n8n workflow's API usage report. */
async function fetchWorkflowUsage(name: 'usage' | 'lead_usage'): Promise<ApiUsage> {
  const json = (await callWebhook(name, { method: 'GET' }, SEND_TIMEOUT_MS)) as Record<string, unknown>;
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

/**
 * Today's third-party API calls, counted in n8n: Google Places by the Lead Gen workflow,
 * job and people sources by the Job Signals workflow. Shows whichever reports load.
 */
export async function fetchApiUsage(): Promise<ApiUsage> {
  const reports = await Promise.allSettled([fetchWorkflowUsage('lead_usage'), fetchWorkflowUsage('usage')]);
  const loaded = reports.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  if (loaded.length === 0) throw (reports[0] as PromiseRejectedResult).reason;
  return { reset_at: loaded[0].reset_at, sources: loaded.flatMap((r) => r.sources) };
}
