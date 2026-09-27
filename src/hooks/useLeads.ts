import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import type { Lead } from '@/types/database';
import { computeLeadStats, deleteLeads, fetchAllLeads, updateLead } from '@/services/leadService';

const NO_LEADS: Lead[] = [];

/**
 * All of the current user's leads. Dashboard, Leads, Analytics and Search share this one
 * cached query; the realtime sync in AppLayout invalidates it when rows change.
 */
export function useLeads() {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: queryKeys.leads(userId),
    queryFn: () => fetchAllLeads(userId!),
    enabled: !!userId,
  });
  const leads = query.data ?? NO_LEADS;
  const stats = useMemo(() => computeLeadStats(leads), [leads]);
  return {
    leads,
    stats,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useLeadMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.leads(user?.id);

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) => updateLead(id, updates),
    // Optimistic: reflect the change immediately, roll back if Supabase rejects it.
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Lead[]>(key);
      queryClient.setQueryData<Lead[]>(key, (old) => old?.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<Lead[]>(key, (old) => old?.map((l) => (l.id === saved.id ? saved : l)));
    },
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteLeads(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { update, remove };
}
