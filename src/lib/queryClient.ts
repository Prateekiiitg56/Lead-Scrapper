import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Realtime subscriptions invalidate on change, so cached data stays fresh without polling.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Query keys shared by hooks and the realtime sync so invalidation stays in one vocabulary. */
export const queryKeys = {
  leads: (userId: string | undefined) => ['leads', userId] as const,
  inbox: (userId: string | undefined) => ['inbox', userId] as const,
  thread: (leadId: string | null) => ['thread', leadId] as const,
  notifications: (userId: string | undefined) => ['notifications', userId] as const,
  outboundCount: (userId: string | undefined) => ['outbound-count', userId] as const,
  searchStats: (userId: string | undefined) => ['search-stats', userId] as const,
  apiUsage: ['api-usage'] as const,
  gmailStatus: (userId: string | undefined) => ['gmail-status', userId] as const,
  botStats: (userId: string | undefined) => ['inbox', userId, 'bot-stats'] as const,
  jobSignals: (userId: string | undefined) => ['job-signals', userId] as const,
  jobSignalStats: (userId: string | undefined) => ['job-signal-stats', userId] as const,
  companyJobs: (companyId: string | null) => ['company-jobs', companyId] as const,
  contactedPeople: (userId: string | undefined) => ['contacted-people', userId] as const,
  companyPeople: (companyId: string | null) => ['company-people', companyId] as const,
};
