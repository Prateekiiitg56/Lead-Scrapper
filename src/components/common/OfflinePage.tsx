import { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflinePage() {
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isChecking, setIsChecking] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        setIsOffline(false);
      }
      setIsChecking(false);
    }, 400);
  };

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-[#080a0c]/95 backdrop-blur-xl flex items-center justify-center p-6 font-sans text-white select-none animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#0d1015]/90 border border-white/[0.12] rounded-[28px] p-8 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] text-center space-y-6 animate-blur-fade-up">
        {/* Disconnected Wifi Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#F0501E]/10 border border-[#F0501E]/20 text-[#F0501E] flex items-center justify-center mx-auto shadow-lg shadow-[#F0501E]/10">
          <WifiOff className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Content Heading & Subtext */}
        <div className="space-y-2">
          <h2 className="text-[26px] leading-tight font-display font-bold text-white tracking-tight">
            No Internet Connection
          </h2>
          <p className="text-[13px] text-white/60 font-medium leading-relaxed max-w-xs mx-auto">
            Check your connection and try again.
          </p>
        </div>

        {/* Orange Retry CTA Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={isChecking}
          className="w-full rounded-full bg-[#F0501E] hover:bg-[#F0501E]/90 text-white text-[14px] font-bold py-3.5 px-6 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#F0501E]/30 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking Connection...' : 'Retry'}</span>
        </button>
      </div>
    </div>
  );
}
