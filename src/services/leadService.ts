import { supabase } from '@/lib/supabase';
import { isOutreachAuthorized } from '@/services/permissionService';
import type { Lead } from '@/types/database';
import type { LeadStatus } from '@/lib/constants';

export async function getLeads(filters?: {
  status?: LeadStatus;
  city?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  user_id?: string;
  user_email?: string | null;
}) {
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.user_id) {
    query = query.eq('assigned_user_id', filters.user_id);
  }

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters?.category) query = query.ilike('category', `%${filters.category}%`);
  if (filters?.search) {
    query = query.or(`business_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const result = await query;
  return { data: result.data as Lead[] | null, count: result.count, error: result.error };
}

export async function getLead(id: string) {
  const result = await supabase.from('leads').select('*').eq('id', id).single();
  return { data: result.data as Lead | null, error: result.error };
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const result = await supabase.from('leads').update(updates).eq('id', id).select().single();
  return { data: result.data as Lead | null, error: result.error };
}

export async function deleteLead(id: string) {
  const result = await supabase.from('leads').delete().eq('id', id);
  return { error: result.error };
}

export async function upsertLeadByPhone(lead: Partial<Lead>) {
  const result = await supabase.from('leads').upsert(lead, { onConflict: 'phone' }).select().single();
  return { data: result.data as Lead | null, error: result.error };
}

export async function getLeadStats(userEmail?: string | null, userId?: string) {
  let query = supabase
    .from('leads')
    .select('status');

  if (userId) {
    query = query.eq('assigned_user_id', userId);
  }

  const { data, error } = await query;

  const leads = data as Array<{ status: string }>;
  const counts: Record<string, number> = {};

  for (const lead of leads) {
    const rawStatus = (lead.status || '').toUpperCase().trim().replace(/\s+/g, '_');
    counts[rawStatus] = (counts[rawStatus] || 0) + 1;
  }

  const newCount = counts['NEW'] || 0;
  const contactedCount = counts['CONTACTED'] || 0;
  const repliedCount = counts['REPLIED'] || 0;
  const interestedCount = counts['INTERESTED'] || 0;
  const followUpCount = counts['FOLLOW_UP'] || counts['FOLLOWUP'] || 0;
  const meetingBookedCount = counts['MEETING_BOOKED'] || counts['MEETINGBOOKED'] || 0;
  const clientCount = counts['CLIENT'] || 0;
  const lostCount = counts['LOST'] || 0;

  const conversionRate = leads.length > 0
    ? (((interestedCount + meetingBookedCount + clientCount) / leads.length) * 100).toFixed(1)
    : '0.0';

  return {
    total: leads.length,
    new: newCount,
    contacted: contactedCount,
    replied: repliedCount,
    interested: interestedCount,
    follow_up: followUpCount,
    meeting_booked: meetingBookedCount,
    client: clientCount,
    lost: lostCount,
    conversion_rate: conversionRate,
  };
}
