import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useApiError } from '@/context/ApiErrorContext';
import type { Conversation } from '@/types/database';
import {
  getConversations,
  getRecentConversations,
  getUnreadCount,
  markAsRead,
  type InboxConversation,
} from '@/services/conversationService';

export function useConversations(leadId: string | null, onRead?: () => void) {
  const { reportApiError, recordSuccessfulFetch } = useApiError();
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!leadId) { setMessages([]); return; }
    setLoading(true);
    try {
      const { data, error: err } = await getConversations(leadId);
      if (err) {
        reportApiError(err);
      } else {
        recordSuccessfulFetch();
        setMessages(data || []);
      }
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }

    // Auto-mark conversation as read when opened
    try {
      await markAsRead(leadId);
      if (onRead) onRead();
    } catch (e) {
      console.warn('Failed to mark conversation as read:', e);
    }
  }, [leadId, onRead, reportApiError, recordSuccessfulFetch]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime for new messages
  useEffect(() => {
    if (!leadId) return;
    const channelName = `conv-${leadId}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `lead_id=eq.${leadId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Conversation]);
        markAsRead(leadId).then(() => {
          if (onRead) onRead();
        });
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, onRead]);

  return { messages, loading, refetch: fetchMessages };
}

export function useInbox() {
  const { user } = useAuth();
  const { reportApiError, recordSuccessfulFetch } = useApiError();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, error: err1 }, count] = await Promise.all([
        getRecentConversations(user?.email, user?.id),
        getUnreadCount(user?.email, user?.id),
      ]);
      if (err1) {
        reportApiError(err1);
      } else {
        recordSuccessfulFetch();
        setConversations(data || []);
        setUnreadCount(count);
      }
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id, reportApiError, recordSuccessfulFetch]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Realtime for new messages or status changes across all conversations & leads
  useEffect(() => {
    const channelName = `inbox-updates-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchInbox();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchInbox();
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInbox]);

  return { conversations, unreadCount, loading, refetch: fetchInbox };
}
