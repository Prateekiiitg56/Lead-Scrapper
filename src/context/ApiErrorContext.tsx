import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ApiErrorContextType {
  isServerUnreachable: boolean;
  lastSuccessfulUpdate: Date | null;
  reportApiError: (error: any) => void;
  recordSuccessfulFetch: () => void;
  clearServerUnreachable: () => void;
  retryLastOperation: () => void;
  setRetryHandler: (handler: () => void) => void;
}

const ApiErrorContext = createContext<ApiErrorContextType | undefined>(undefined);

export function ApiErrorProvider({ children }: { children: React.ReactNode }) {
  const [isServerUnreachable, setIsServerUnreachable] = useState(false);
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('lead_scrapper_last_sync');
    return saved ? new Date(saved) : new Date();
  });
  const [retryHandler, setRetryHandlerState] = useState<(() => void) | null>(null);

  const recordSuccessfulFetch = useCallback(() => {
    const now = new Date();
    setLastSuccessfulUpdate(now);
    localStorage.setItem('lead_scrapper_last_sync', now.toISOString());
    setIsServerUnreachable(false);
  }, []);

  const reportApiError = useCallback((error: any) => {
    if (!error) return;

    // Log non-technical debug info to developer console
    console.error('[API Error Intercepted]:', error.message || error);

    const errorMessage = String(error.message || error || '').toLowerCase();
    const status = error.status || error.code || error.statusCode;

    // Network level failure (fetch throws TypeError / Failed to fetch / ngrok connection refused / CORS / offline)
    const isNetworkFetchError =
      error instanceof TypeError ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('econnrefused');

    // 5xx Server Error statuses (500, 502, 503, 504)
    const is5xxStatus =
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (typeof status === 'number' && status >= 500 && status <= 599);

    // Only trigger full-screen ServerUnreachable takeover on true 5xx or network-level server failures,
    // NOT on valid 4xx client errors (400, 401, 403, 404) or permission errors.
    if (isNetworkFetchError || is5xxStatus) {
      if (navigator.onLine) {
        setIsServerUnreachable(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__REPORT_API_ERROR__ = reportApiError;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__REPORT_API_ERROR__;
      }
    };
  }, [reportApiError]);

  const clearServerUnreachable = useCallback(() => {
    setIsServerUnreachable(false);
  }, []);

  const setRetryHandler = useCallback((handler: () => void) => {
    setRetryHandlerState(() => handler);
  }, []);

  const retryLastOperation = useCallback(() => {
    setIsServerUnreachable(false);
    if (retryHandler) {
      retryHandler();
    } else {
      window.location.reload();
    }
  }, [retryHandler]);

  return (
    <ApiErrorContext.Provider
      value={{
        isServerUnreachable,
        lastSuccessfulUpdate,
        reportApiError,
        recordSuccessfulFetch,
        clearServerUnreachable,
        retryLastOperation,
        setRetryHandler,
      }}
    >
      {children}
    </ApiErrorContext.Provider>
  );
}

export function useApiError() {
  const context = useContext(ApiErrorContext);
  if (!context) {
    throw new Error('useApiError must be used within an ApiErrorProvider');
  }
  return context;
}
