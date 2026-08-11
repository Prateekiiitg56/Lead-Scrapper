import { supabase } from '@/lib/supabase';
import { isOutreachAuthorized } from '@/services/permissionService';
import type { Conversation } from '@/types/database';

export async function getConversations(leadId: string) {
  const result = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: true });

  return { data: result.data as Conversation[] | null, error: result.error };
}

export interface InboxConversation extends Conversation {
  leads: {
    id: string;
    business_name: string;
    phone: string;
    status: string;
    ai_summary: string | null;
    last_reply_at: string | null;
    assigned_user_id?: string | null;
  };
}

export async function getRecentConversations(userEmail?: string | null, userId?: string) {
  let query = supabase
    .from('conversations')
    .select('*, leads!inner(id, business_name, phone, status, ai_summary, last_reply_at, assigned_user_id)')
    .order('timestamp', { ascending: false });

  if (userId) {
    query = query.eq('leads.assigned_user_id', userId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  // Deduplicate by lead_id — keep only the latest message per lead
  const rows = (data || []) as InboxConversation[];
  const seen = new Set<string>();
  const unique: InboxConversation[] = [];
  for (const msg of rows) {
    if (!seen.has(msg.lead_id)) {
      seen.add(msg.lead_id);
      unique.push(msg);
    }
  }

  return { data: unique, error: null };
}

export async function addConversation(conversation: Omit<Conversation, 'id' | 'created_at'>) {
  const result = await supabase.from('conversations').insert(conversation).select().single();
  return { data: result.data as Conversation | null, error: result.error };
}

export async function markAsRead(leadId: string) {
  const result = await supabase
    .from('conversations')
    .update({ status: 'read' })
    .eq('lead_id', leadId)
    .eq('direction', 'INBOUND')
    .not('status', 'eq', 'read');

  return { error: result.error };
}

export async function getUnreadCount(userEmail?: string | null, userId?: string) {
  let query = supabase
    .from('conversations')
    .select('*, leads!inner(assigned_user_id)', { count: 'exact', head: true })
    .eq('direction', 'INBOUND')
    .not('status', 'eq', 'read');

  if (userId) {
    query = query.eq('leads.assigned_user_id', userId);
  }

  const { count } = await query;
  return count || 0;
}
