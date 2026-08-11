import { useState } from 'react';
import { ServerOff, RefreshCw, Clock } from 'lucide-react';
import { useApiError } from '@/context/ApiErrorContext';
import { timeAgo } from '@/lib/utils';

export function ServerUnreachablePage() {
  const { isServerUnreachable, lastSuccessfulUpdate, retryLastOperation } = useApiError();
  const [retrying, setRetrying] = useState(false);

  if (!isServerUnreachable) {
    return null;
  }

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      retryLastOperation();
      setRetrying(false);
    }, 500);
  };

  const formattedLastSync = lastSuccessfulUpdate
    ? timeAgo(lastSuccessfulUpdate.toISOString())
    : null;

  return (
    <div className="fixed inset-0 z-[99998] bg-[#080a0c]/95 backdrop-blur-xl flex items-center justify-center p-6 font-sans text-white select-none animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#0d1015]/90 border border-white/[0.12] rounded-[28px] p-8 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] text-center space-y-6 animate-blur-fade-up">
        {/* Server Down Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <ServerOff className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Content Heading & Subtext */}
        <div className="space-y-2">
          <h2 className="text-[24px] leading-tight font-display font-bold text-white tracking-tight">
            We Can't Reach Our Server Right Now
          </h2>
          <p className="text-[13px] text-white/60 font-medium leading-relaxed max-w-xs mx-auto">
            This might be temporary — please try again in a moment.
          </p>
        </div>

        {/* Optional Last Sync Timestamp Subtext */}
        {formattedLastSync && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/50 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Last successful update: {formattedLastSync}</span>
          </div>
        )}

        {/* Orange Retry CTA Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="w-full rounded-full bg-[#F0501E] hover:bg-[#F0501E]/90 text-white text-[14px] font-bold py-3.5 px-6 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#F0501E]/30 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Reconnecting to Server...' : 'Retry'}</span>
        </button>
      </div>
    </div>
  );
}
