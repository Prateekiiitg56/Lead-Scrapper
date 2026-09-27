import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';

/**
 * One realtime channel for the whole app. Row changes invalidate the matching React Query
 * caches instead of each page opening its own subscription and refetching independently.
 * Bursts of events (bulk deletes, n8n batches) are coalesced into one invalidation.
 */
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const pending = new Set<string>();
    const threads = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      timer = undefined;
      if (pending.has('leads')) queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId) });
      if (pending.has('conversations')) queryClient.invalidateQueries({ queryKey: queryKeys.outboundCount(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      threads.forEach((id) => queryClient.invalidateQueries({ queryKey: queryKeys.thread(id) }));
      pending.clear();
      threads.clear();
    };

    const schedule = (table: string, leadId?: string) => {
      pending.add(table);
      if (leadId) threads.add(leadId);
      if (!timer) timer = setTimeout(flush, 250);
    };

    const channel = supabase
      .channel(`crm-sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `assigned_user_id=eq.${userId}` }, () =>
        schedule('leads')
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        const row = (payload.new && 'lead_id' in payload.new ? payload.new : payload.old) as { lead_id?: string };
        schedule('conversations', row?.lead_id);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
