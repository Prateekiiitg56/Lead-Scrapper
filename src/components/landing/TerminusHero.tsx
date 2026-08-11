import { useState, useRef, useEffect } from 'react';

const VIDEO_URL = '/terminus.mp4';

export function TerminusHero({ onEnterApp }: { onEnterApp?: () => void }) {
  const [activeVideo, setActiveVideo] = useState<0 | 1>(0);
  const [fadeState, setFadeState] = useState<{ 0: number; 1: number }>({ 0: 1, 1: 0 });
  const isTransitioningRef = useRef(false);

  const videoRef0 = useRef<HTMLVideoElement | null>(null);
  const videoRef1 = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef0.current) {
      videoRef0.current.play().catch(() => {});
    }
  }, []);

  const handleTimeUpdate = (index: 0 | 1) => {
    const activeRef   = index === 0 ? videoRef0 : videoRef1;
    const inactiveRef = index === 0 ? videoRef1 : videoRef0;
    const inactiveIndex: 0 | 1 = index === 0 ? 1 : 0;

    const currentVid = activeRef.current;
    const nextVid    = inactiveRef.current;
    if (!currentVid || !nextVid || isTransitioningRef.current) return;

    const duration    = currentVid.duration;
    const currentTime = currentVid.currentTime;

    if (duration > 0 && duration - currentTime <= 1.0) {
      isTransitioningRef.current = true;
      nextVid.currentTime = 0;
      nextVid.play().then(() => {
        setFadeState({ [index]: 0, [inactiveIndex]: 1 } as { 0: number; 1: number });
        setTimeout(() => {
          currentVid.pause();
          setActiveVideo(inactiveIndex);
          isTransitioningRef.current = false;
        }, 950);
      }).catch(() => {
        isTransitioningRef.current = false;
      });
    }
  };

  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-[#080a0c] text-white select-none">
      {/* ── VIDEO (z-0) ── */}
      <div className="fixed inset-0 w-full h-[100svh] z-0 overflow-hidden bg-[#080a0c] video-player-container">
        <video
          ref={videoRef0}
          src={VIDEO_URL}
          muted
          playsInline
          autoPlay
          onTimeUpdate={() => activeVideo === 0 && handleTimeUpdate(0)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-linear"
          style={{ opacity: fadeState[0] }}
        />
        <video
          ref={videoRef1}
          src={VIDEO_URL}
          muted
          playsInline
          onTimeUpdate={() => activeVideo === 1 && handleTimeUpdate(1)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-linear"
          style={{ opacity: fadeState[1] }}
        />
      </div>

      {/* ── SCRIM (z-1) ── */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(8,10,12,0.96) 0%, rgba(8,10,12,0.45) 36%, transparent 64%)',
        }}
      />

      {/* ── NAV (z-10) ── */}
      <header className="relative z-10 max-w-7xl mx-auto px-8 py-7 flex items-center justify-between">
        <span className="text-[26px] leading-none tracking-tight text-white font-display">
          Lead-Scrapper
        </span>

        <nav className="hidden md:flex items-center gap-8">
          {['Leads', 'Inbox', 'Analytics'].map((link) => (
            <button
              key={link}
              type="button"
              onClick={onEnterApp}
              className="text-[13px] text-white/80 hover:text-white font-medium transition-colors duration-200 cursor-pointer"
            >
              {link}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {onEnterApp && (
            <button
              onClick={onEnterApp}
              className="text-[13px] text-white/90 hover:text-white px-4 py-2 rounded-full border border-white/30 hover:border-white/60 transition-all font-medium cursor-pointer"
            >
              Get started
            </button>
          )}
          <button
            type="button"
            onClick={onEnterApp}
            className="bg-[#F0501E] hover:bg-[#F0501E]/90 text-white text-[13px] font-semibold px-5 py-2 rounded-full shadow-md transition-all cursor-pointer"
          >
            Open dashboard
          </button>
        </div>
      </header>

      {/* ── HERO CONTENT (bottom-anchored) ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pb-20 min-h-[calc(100svh-104px)] flex flex-col justify-end">
        <div className="[animation-fill-mode:both] animate-fade-rise text-[11px] font-mono text-[#F0501E] font-bold uppercase tracking-widest mb-2" style={{ opacity: 0 }}>
          WhatsApp outreach, on autopilot
        </div>

        <h1
          className="mt-6 max-w-[13ch] text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-white [animation-fill-mode:both] animate-fade-rise [animation-delay:200ms] font-display font-bold"
          style={{ opacity: 0 }}
        >
          Leads found.{' '}
          <em className="not-italic text-white/60">
            Deals closed.
          </em>
        </h1>

        <div className="mt-10 flex items-center gap-5 [animation-fill-mode:both] animate-fade-rise [animation-delay:400ms]" style={{ opacity: 0 }}>
          {/* Primary: opens dashboard/login */}
          <button
            type="button"
            onClick={onEnterApp}
            className="rounded-full bg-[#F0501E] hover:bg-[#F0501E]/90 text-white px-7 py-3.5 text-[13px] font-semibold shadow-lg shadow-[#F0501E]/20 transition-all cursor-pointer"
          >
            Open dashboard
          </button>

          {/* Secondary: scroll to how-it-works */}
          <a
            href="#how-it-works"
            className="text-[13px] text-white/80 hover:text-white font-medium transition-colors duration-200"
          >
            See how it works ↓
          </a>
        </div>
      </main>

      {/* ── FOOTER (pinned to hero bottom) ── */}
      <footer className="pointer-events-none absolute bottom-0 inset-x-0 z-10 max-w-7xl mx-auto px-8 pb-8">
        <div className="flex items-center justify-between border-t border-white/20 pt-5 text-[11px] font-mono uppercase tracking-[0.3em] text-white/70">
          <span>AI-powered</span>
          <span className="hidden sm:block">WhatsApp outreach</span>
          <span>Real-time CRM</span>
        </div>
      </footer>
    </div>
  );
}
