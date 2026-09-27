import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface ApiErrorContextType {
  isServerUnreachable: boolean;
  lastSuccessfulUpdate: Date | null;
  retryLastOperation: () => void;
}

const ApiErrorContext = createContext<ApiErrorContextType | undefined>(undefined);

const LAST_SYNC_KEY = 'lead_scrapper_last_sync';

/** True only for network-level failures and 5xx responses — never for 4xx/RLS/validation errors. */
function isServerFailure(error: unknown): boolean {
  if (!error) return false;
  const e = error as { message?: unknown; status?: unknown; code?: unknown; statusCode?: unknown };
  const message = String(e.message ?? error).toLowerCase();
  const status = Number(e.status ?? e.statusCode ?? e.code);

  const isNetwork =
    error instanceof TypeError ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('connection refused') ||
    message.includes('econnrefused');

  return isNetwork || (status >= 500 && status <= 599);
}

/**
 * Watches every Supabase-backed query in the React Query cache. A network/5xx failure
 * shows the full-screen "server unreachable" takeover; any success clears it.
 */
export function ApiErrorProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isServerUnreachable, setIsServerUnreachable] = useState(false);
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_SYNC_KEY);
      return saved ? new Date(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const { action } = event;
      if (action.type === 'success') {
        const now = new Date();
        setLastSuccessfulUpdate(now);
        setIsServerUnreachable(false);
        try { localStorage.setItem(LAST_SYNC_KEY, now.toISOString()); } catch { /* ignore */ }
      } else if (action.type === 'error') {
        console.error('[API error]', action.error);
        if (isServerFailure(action.error) && navigator.onLine) setIsServerUnreachable(true);
      }
    });
  }, [queryClient]);

  const retryLastOperation = useCallback(() => {
    setIsServerUnreachable(false);
    queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const value = useMemo(
    () => ({ isServerUnreachable, lastSuccessfulUpdate, retryLastOperation }),
    [isServerUnreachable, lastSuccessfulUpdate, retryLastOperation]
  );

  return <ApiErrorContext.Provider value={value}>{children}</ApiErrorContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useApiError() {
  const context = useContext(ApiErrorContext);
  if (!context) throw new Error('useApiError must be used within an ApiErrorProvider');
  return context;
}
