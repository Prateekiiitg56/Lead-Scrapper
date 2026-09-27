import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { fetchInbox, fetchThread, markThreadRead } from '@/services/conversationService';

/** Latest message per lead + unread count. Kept fresh by the realtime sync in AppLayout. */
export function useInbox() {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: queryKeys.inbox(userId),
    queryFn: () => fetchInbox(userId!),
    enabled: !!userId,
  });
  return {
    conversations: query.data?.conversations ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Messages in one thread. Marks inbound messages read whenever the thread has unread ones. */
export function useThread(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.thread(leadId),
    queryFn: () => fetchThread(leadId!),
    enabled: !!leadId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markThreadRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id) });
    },
  });

  const hasUnread = !!query.data?.some((m) => m.direction === 'INBOUND' && m.status !== 'read');
  const { mutate } = markRead;
  useEffect(() => {
    if (leadId && hasUnread) mutate(leadId);
  }, [leadId, hasUnread, mutate]);

  return {
    messages: query.data ?? [],
    loading: query.isPending && !!leadId,
    error: query.error,
    refetch: query.refetch,
  };
}
