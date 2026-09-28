import { supabase } from '@/lib/supabase';
import type { Conversation } from '@/types/database';
import type { OutreachStats } from '@/types/api';
import type { LeadStatus } from '@/lib/constants';

export interface InboxLead {
  id: string;
  business_name: string;
  phone: string | null;
  status: LeadStatus;
  ai_summary: string | null;
  last_reply_at: string | null;
}

export interface InboxConversation extends Conversation {
  leads: InboxLead;
}

/** Most recent messages scanned to build the inbox; older threads beyond this window are not listed. */
const INBOX_SCAN_LIMIT = 1000;

export async function fetchThread(leadId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

/** Latest message per lead, newest first, plus the user's unread inbound count. */
export async function fetchInbox(userId: string): Promise<{ conversations: InboxConversation[]; unreadCount: number }> {
  const [messages, unread] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, leads!inner(id, business_name, phone, status, ai_summary, last_reply_at)')
      .eq('leads.assigned_user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(INBOX_SCAN_LIMIT),
    supabase
      .from('conversations')
      .select('id, leads!inner(assigned_user_id)', { count: 'exact', head: true })
      .eq('leads.assigned_user_id', userId)
      .eq('direction', 'INBOUND')
      .neq('status', 'read'),
  ]);
  if (messages.error) throw messages.error;
  if (unread.error) throw unread.error;

  const seen = new Set<string>();
  const conversations: InboxConversation[] = [];
  for (const row of (messages.data ?? []) as InboxConversation[]) {
    if (seen.has(row.lead_id)) continue;
    seen.add(row.lead_id);
    conversations.push(row);
  }
  return { conversations, unreadCount: unread.count ?? 0 };
}

export async function markThreadRead(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'read' })
    .eq('lead_id', leadId)
    .eq('direction', 'INBOUND')
    .neq('status', 'read');
  if (error) throw error;
}

/** RLS scopes this to conversations on the current user's leads. */
export async function markAllInboundRead(): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'read' })
    .eq('direction', 'INBOUND')
    .neq('status', 'read');
  if (error) throw error;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string;
  type: 'message' | 'lead';
}

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const [convs, leads] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, message, timestamp, status, leads!inner(business_name, assigned_user_id)')
      .eq('leads.assigned_user_id', userId)
      .eq('direction', 'INBOUND')
      .order('timestamp', { ascending: false })
      .limit(4),
    supabase
      .from('leads')
      .select('id, business_name, status, created_at')
      .eq('assigned_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);
  if (convs.error) throw convs.error;
  if (leads.error) throw leads.error;

  type ConvRow = { id: string; message: string | null; timestamp: string; status: string; leads: { business_name: string } };
  const items: NotificationItem[] = [
    ...((convs.data ?? []) as unknown as ConvRow[]).map((c) => ({
      id: `conv-${c.id}`,
      title: `New message from ${c.leads?.business_name || 'Prospect'}`,
      body: c.message || 'Sent an attachment',
      time: c.timestamp,
      read: c.status === 'read',
      link: '/inbox',
      type: 'message' as const,
    })),
    ...(leads.data ?? []).map((l) => ({
      id: `lead-${l.id}`,
      title: `Lead saved: ${l.business_name}`,
      body: `Status: ${l.status || 'NEW'}`,
      time: l.created_at,
      read: true,
      link: `/leads?search=${encodeURIComponent(l.business_name)}`,
      type: 'lead' as const,
    })),
  ];
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
}

/** The user's own outreach counters: outbound messages on leads assigned to them (all channels). */
export async function fetchOutreachStats(userId: string): Promise<OutreachStats> {
  const outbound = () =>
    supabase
      .from('conversations')
      .select('id, leads!inner(assigned_user_id)', { count: 'exact', head: true })
      .eq('leads.assigned_user_id', userId)
      .eq('direction', 'OUTBOUND');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [month, total] = await Promise.all([outbound().gte('timestamp', monthStart), outbound()]);
  if (month.error) throw month.error;
  if (total.error) throw total.error;
  return { sent_this_month: month.count ?? 0, total_logged: total.count ?? 0 };
}

export interface BotStats {
  repliesThisMonth: number;
  classifiedThisMonth: number;
  lastInboundAt: string | null;
}

/** Activity of the inbound WhatsApp automation (n8n webhook + Gemini classifier) on the user's leads. */
export async function fetchBotStats(userId: string): Promise<BotStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const inbound = () =>
    supabase
      .from('conversations')
      .select('id, leads!inner(assigned_user_id)', { count: 'exact', head: true })
      .eq('leads.assigned_user_id', userId)
      .eq('direction', 'INBOUND')
      .gte('timestamp', monthStart);
  const [replies, classified, last] = await Promise.all([
    inbound(),
    inbound().not('ai_classification', 'is', null),
    supabase
      .from('conversations')
      .select('timestamp, leads!inner(assigned_user_id)')
      .eq('leads.assigned_user_id', userId)
      .eq('direction', 'INBOUND')
      .order('timestamp', { ascending: false })
      .limit(1),
  ]);
  if (replies.error) throw replies.error;
  if (classified.error) throw classified.error;
  if (last.error) throw last.error;
  return {
    repliesThisMonth: replies.count ?? 0,
    classifiedThisMonth: classified.count ?? 0,
    lastInboundAt: (last.data?.[0] as { timestamp?: string } | undefined)?.timestamp ?? null,
  };
}

export async function fetchOutboundCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('conversations')
    .select('id, leads!inner(assigned_user_id)', { count: 'exact', head: true })
    .eq('leads.assigned_user_id', userId)
    .eq('direction', 'OUTBOUND')
    .in('message_type', ['template', 'text']);
  if (error) throw error;
  return count ?? 0;
}
