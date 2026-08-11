import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useApiError } from '@/context/ApiErrorContext';
import type { Lead } from '@/types/database';
import type { LeadStatus } from '@/lib/constants';
import { getLeads, getLeadStats, updateLead, deleteLead } from '@/services/leadService';

export function useLeads(filters?: {
  status?: LeadStatus;
  search?: string;
  city?: string;
  category?: string;
}) {
  const { user } = useAuth();
  const { reportApiError, recordSuccessfulFetch, setRetryHandler } = useApiError();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count, error: err } = await getLeads({
        ...filters,
        user_id: user?.id,
        user_email: user?.email,
        limit: 50,
      });
      if (err) {
        reportApiError(err);
        setError(err.message);
      } else {
        recordSuccessfulFetch();
        setLeads(data || []);
        setTotal(count || 0);
      }
    } catch (err) {
      reportApiError(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.search, filters?.city, filters?.category, user?.id, user?.email, reportApiError, recordSuccessfulFetch]);

  useEffect(() => {
    setRetryHandler(fetchLeads);
  }, [fetchLeads, setRetryHandler]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Realtime subscription
  useEffect(() => {
    const channelName = `leads-changes-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const update = async (id: string, updates: Partial<Lead>) => {
    const { error: err } = await updateLead(id, updates);
    if (err) reportApiError(err);
    else fetchLeads();
    return err;
  };

  const remove = async (id: string) => {
    const { error: err } = await deleteLead(id);
    if (err) reportApiError(err);
    else fetchLeads();
    return err;
  };

  return { leads, total, loading, error, refetch: fetchLeads, update, remove };
}

export function useLeadStats() {
  const { user } = useAuth();
  const { reportApiError, recordSuccessfulFetch } = useApiError();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getLeadStats>>>(null);
  const [loading, setLoading] = useState(true);

  const fetchFn = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeadStats(user?.email, user?.id);
      recordSuccessfulFetch();
      setStats(data);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id, reportApiError, recordSuccessfulFetch]);

  useEffect(() => { fetchFn(); }, [fetchFn]);

  // Realtime
  useEffect(() => {
    const channelName = `leads-stats-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchFn();
      });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchFn]);

  return { stats, loading, refetch: fetchFn };
}
