import { supabase } from '@/lib/supabase';
import type { Lead, Conversation } from '@/types/database';
import type { LeadStatus } from '@/lib/constants';

const PAGE_SIZE = 1000;

/** Fetch every lead owned by the user (RLS also enforces ownership). Pages past PostgREST's row cap. */
export async function fetchAllLeads(userId: string): Promise<Lead[]> {
  const all: Lead[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('assigned_user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Lead[]));
    if (!data || data.length < PAGE_SIZE) return all;
  }
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  replied: number;
  interested: number;
  follow_up: number;
  meeting_booked: number;
  client: number;
  lost: number;
}

export function computeLeadStats(leads: Pick<Lead, 'status'>[]): LeadStats {
  const stats: LeadStats = {
    total: leads.length, new: 0, contacted: 0, replied: 0, interested: 0,
    follow_up: 0, meeting_booked: 0, client: 0, lost: 0,
  };
  for (const { status } of leads) {
    const key = (status || 'NEW').toLowerCase() as keyof LeadStats;
    if (key !== 'total' && key in stats) stats[key] += 1;
  }
  return stats;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  // .single() turns an RLS-filtered zero-row update into an error instead of a silent no-op.
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function deleteLeads(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { data, error } = await supabase.from('leads').delete().in('id', ids).select('id');
  if (error) throw error;
  if ((data?.length ?? 0) !== ids.length) {
    throw new Error(`Only ${data?.length ?? 0} of ${ids.length} leads could be deleted. Refresh and try again.`);
  }
}

/** "+<digits>" or null when the input has too few digits to be a phone number. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? `+${digits}` : null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const email = (raw ?? '').trim().toLowerCase();
  return email || null;
}

export interface LeadInput {
  business_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  rating?: number | null;
  category?: string | null;
  city?: string | null;
  linkedin_url?: string | null;
}

/** Columns added by migration 002. Databases without it reject writes that mention them. */
const MIGRATION_002_COLUMNS = ['email', 'linkedin_url'] as const;

function isMissingColumnError(error: { code?: string } | null): boolean {
  // 42703: undefined_column (Postgres). PGRST204: column not in PostgREST schema cache.
  return error?.code === '42703' || error?.code === 'PGRST204';
}

function withoutMigration002Columns<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const col of MIGRATION_002_COLUMNS) delete copy[col];
  return copy;
}

export const MISSING_MIGRATION_002 =
  'The database is missing the email/LinkedIn columns. Apply supabase/migrations/002_email_linkedin_channels.sql.';

/** Statuses that outreach may promote from. Never downgrade a lead that is further along. */
const PROMOTABLE_TO_CONTACTED: LeadStatus[] = ['NEW'];

async function findOwnedLead(userId: string, phone: string | null, email: string | null) {
  if (phone) {
    const { data, error } = await supabase
      .from('leads').select('*')
      .eq('assigned_user_id', userId)
      .eq('phone_clean', phone.slice(1))
      .limit(1);
    if (error) throw error;
    if (data?.[0]) return data[0] as Lead;
  }
  if (email) {
    const { data, error } = await supabase
      .from('leads').select('*')
      .eq('assigned_user_id', userId)
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)) // case-insensitive, like the unique index
      .limit(1);
    if (isMissingColumnError(error)) return null; // pre-002 schema: no email column to match on
    if (error) throw error;
    if (data?.[0]) return data[0] as Lead;
  }
  return null;
}

/**
 * Create or update the user's CRM record for a business. Matches the user's own leads by
 * phone, then email. Fills blank fields without overwriting data the user already has.
 */
export async function saveLeadForUser(
  userId: string,
  input: LeadInput,
  opts: { markContacted?: boolean } = {}
): Promise<Lead> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  if (!phone && !email) throw new Error('A phone number or email is required to save this lead.');

  const now = new Date().toISOString();
  const existing = await findOwnedLead(userId, phone, email);

  if (existing) {
    const updates: Partial<Lead> = {};
    if (!existing.phone && phone) updates.phone = phone;
    if (!existing.email && email) updates.email = email;
    if (!existing.address && input.address) updates.address = input.address;
    if (!existing.website && input.website) {
      updates.website = input.website;
      updates.has_website = true;
    }
    if (!existing.category && input.category) updates.category = input.category;
    if (!existing.city && input.city) updates.city = input.city;
    if (!existing.linkedin_url && input.linkedin_url) updates.linkedin_url = input.linkedin_url;
    if (existing.rating == null && input.rating != null) updates.rating = input.rating;
    if (opts.markContacted) {
      updates.last_contact_at = now;
      if (PROMOTABLE_TO_CONTACTED.includes(existing.status)) updates.status = 'CONTACTED';
    }
    if (!Object.keys(updates).length) return existing;
    try {
      return await updateLead(existing.id, updates);
    } catch (err) {
      if (!isMissingColumnError(err as { code?: string })) throw err;
      const fallback = withoutMigration002Columns(updates as Record<string, unknown>) as Partial<Lead>;
      return Object.keys(fallback).length ? updateLead(existing.id, fallback) : existing;
    }
  }

  const row: Record<string, unknown> = {
    business_name: input.business_name,
    phone,
    address: input.address || null,
    website: input.website || null,
    has_website: !!input.website,
    rating: input.rating ?? null,
    category: input.category || null,
    city: input.city || null,
    status: opts.markContacted ? 'CONTACTED' : 'NEW',
    last_contact_at: opts.markContacted ? now : null,
    assigned_user_id: userId,
  };
  if (email) row.email = email;
  if (input.linkedin_url) row.linkedin_url = input.linkedin_url;

  let { data, error } = await supabase.from('leads').insert(row).select().single();
  if (isMissingColumnError(error) && phone) {
    // Still save phone-reachable leads on a database without migration 002.
    ({ data, error } = await supabase.from('leads').insert(withoutMigration002Columns(row)).select().single());
  }

  if (error) {
    if (isMissingColumnError(error)) throw new Error(MISSING_MIGRATION_002);
    // Unique phone/email owned by another account or an unassigned (n8n-created) row.
    if (error.code === '23505' || error.code === '42501') {
      throw new Error(
        'This business already exists in the database but is not assigned to your account, so it cannot be added to your CRM.'
      );
    }
    throw error;
  }
  return data as Lead;
}

/** Record an outbound touch: save/promote the lead, then log the conversation row. */
export async function recordOutreach(
  userId: string,
  input: LeadInput,
  conversation: Pick<Conversation, 'message' | 'message_type'> & { template_name?: string | null }
): Promise<Lead> {
  const lead = await saveLeadForUser(userId, input, { markContacted: true });
  const { error } = await supabase.from('conversations').insert({
    lead_id: lead.id,
    direction: 'OUTBOUND',
    message: conversation.message,
    message_type: conversation.message_type,
    template_name: conversation.template_name ?? null,
    status: 'sent',
  });
  // 22P02: 'email'/'linkedin' are not yet values of the message_type enum (added by migration 002).
  if (error?.code === '22P02') throw new Error(MISSING_MIGRATION_002);
  if (error) throw error;
  return lead;
}
