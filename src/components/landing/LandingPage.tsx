import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TerminusHero } from './TerminusHero';

/* ── Scroll-reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          obs.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Mock Lead row (High-Contrast Text) ── */
function LeadRow({ name, phone, status, delay }: { name: string; phone: string; status: string; delay: string }) {
  return (
    <div
      className="flex items-center justify-between py-3.5 border-b border-white/10 last:border-0 reveal-child"
      style={{ transitionDelay: delay }}
    >
      <div>
        <div className="text-[14px] text-white font-semibold">{name}</div>
        <div className="text-[12px] text-white/70 font-mono mt-0.5">{phone}</div>
      </div>
      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F0501E]/20 border border-[#F0501E]/40 text-[#F0501E]">
        {status}
      </span>
    </div>
  );
}

/* ── Mock chat bubble (High-Contrast Text) ── */
function Bubble({ text, direction, delay }: { text: string; direction: 'in' | 'out'; delay: string }) {
  return (
    <div
      className={`flex ${direction === 'out' ? 'justify-end' : 'justify-start'} reveal-child`}
      style={{ transitionDelay: delay }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
          direction === 'in'
            ? 'bg-white/15 border border-white/20 text-white font-medium rounded-bl-md'
            : 'bg-[#F0501E] text-white font-bold rounded-br-md shadow-[#F0501E]/20'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

/* ── Metric bar ── */
function MetricBar({ label, pct, delay }: { label: string; pct: number; delay: string }) {
  return (
    <div className="space-y-2 reveal-child" style={{ transitionDelay: delay }}>
      <div className="flex justify-between">
        <span className="text-[13px] text-white/80 font-medium">{label}</span>
        <span className="text-[13px] font-mono font-bold text-white">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-[#F0501E] rounded-full bar-fill"
          style={{ '--target-width': `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/* ── Feature Section ── */
function FeatureSection({
  id,
  index,
  eyebrow,
  headline,
  sub,
  children,
  flip,
}: {
  id: string;
  index: string;
  eyebrow: string;
  headline: string;
  sub: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  const ref = useReveal();
  return (
    <section
      id={id}
      ref={ref}
      className={`reveal-section max-w-7xl mx-auto px-8 py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${
        flip ? 'lg:[&>*:first-child]:order-2' : ''
      }`}
    >
      {/* Text */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 reveal-child" style={{ transitionDelay: '0ms' }}>
          <span className="text-[11px] font-mono text-[#F0501E] font-bold tracking-widest">{index}</span>
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] font-mono text-[#F0501E] font-bold uppercase tracking-widest">{eyebrow}</span>
        </div>
        <h2
          className="text-4xl sm:text-5xl leading-[0.95] tracking-[-0.02em] text-white reveal-child font-display font-bold"
          style={{ transitionDelay: '100ms' }}
        >
          {headline}
        </h2>
        <p className="text-[15px] text-white/80 leading-relaxed max-w-md reveal-child font-sans" style={{ transitionDelay: '200ms' }}>
          {sub}
        </p>
      </div>

      {/* Visual card */}
      <div className="bg-[#161a22]/90 border border-white/20 rounded-[24px] p-7 reveal-child shadow-2xl backdrop-blur-xl" style={{ transitionDelay: '300ms' }}>
        {children}
      </div>
    </section>
  );
}

/* ── Final CTA section ── */
function CtaSection({ onEnterApp }: { onEnterApp?: () => void }) {
  const ref = useReveal();
  return (
    <section ref={ref} className="reveal-section max-w-7xl mx-auto px-8 py-28 text-center space-y-8">
      <div className="text-[11px] font-mono text-[#F0501E] font-bold uppercase tracking-widest reveal-child" style={{ transitionDelay: '0ms' }}>Ready</div>
      <h2
        className="text-5xl sm:text-6xl leading-[0.95] tracking-[-0.02em] text-white reveal-child font-display font-bold"
        style={{ transitionDelay: '150ms' }}
      >
        Your leads are{' '}
        <em className="not-italic text-white/60">waiting.</em>
      </h2>
      <div className="flex items-center justify-center gap-5 reveal-child" style={{ transitionDelay: '300ms' }}>
        <button
          onClick={onEnterApp}
          className="rounded-full bg-[#F0501E] hover:bg-[#F0501E]/90 text-white px-8 py-4 text-[14px] font-bold transition-all shadow-lg shadow-[#F0501E]/30 cursor-pointer"
        >
          Open dashboard
        </button>
      </div>
      <div className="border-t border-white/10 pt-8 reveal-child" style={{ transitionDelay: '450ms' }}>
        <div className="flex items-center justify-center gap-12 text-[11px] font-mono uppercase tracking-[0.3em] text-white/60 mb-6">
          <span>AI-powered</span>
          <span>WhatsApp outreach</span>
          <span>Real-time CRM</span>
        </div>

        {/* Footer Legal & SaaS Compliance Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 text-[12px] text-white/50 max-w-4xl mx-auto">
          <span>© 2026 Lead-Scrapper Inc. All rights reserved.</span>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              App Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main Export ── */
export function LandingPage({ onEnterApp }: { onEnterApp?: () => void }) {
  return (
    <>
      {/* styles for scroll-reveal + bar animation */}
      <style>{`
        .reveal-section .reveal-child {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-section.revealed .reveal-child {
          opacity: 1;
          transform: translateY(0);
        }
        .bar-fill {
          width: 0;
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
        }
        .reveal-section.revealed .bar-fill {
          width: var(--target-width);
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-section .reveal-child {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
          .bar-fill { width: var(--target-width) !important; transition: none !important; }
        }
      `}</style>

      {/* ── Hero (full-height) ── */}
      <TerminusHero onEnterApp={onEnterApp} />

      {/* ── "How it works" entry ── */}
      <div id="how-it-works" className="bg-[#080a0c]">
        <div className="max-w-7xl mx-auto px-8 pt-24 pb-4">
          <div className="text-[12px] font-mono uppercase tracking-[0.42em] text-[#F0501E] font-bold text-center">
            How it works
          </div>
        </div>

        {/* ── Section 01: Leads ── */}
        <FeatureSection
          id="leads"
          index="01"
          eyebrow="Lead discovery"
          headline="Find businesses before they find you."
          sub="Search any city, any category. Google Places surfaces hundreds of real businesses with phone numbers, ratings, and addresses — ready for outreach."
        >
          <div className="text-[12px] font-mono text-[#F0501E] font-bold uppercase tracking-wider mb-4">Live pipeline</div>
          <LeadRow name="The Green Fork"       phone="+91 98765 43210" status="Replied"   delay="400ms" />
          <LeadRow name="Nova Hair Studio"     phone="+91 90000 11223" status="Interested" delay="550ms" />
          <LeadRow name="Atlas Real Estate"    phone="+91 87654 32109" status="Contacted"  delay="700ms" />
          <LeadRow name="Riverside Auto Works" phone="+91 76543 21098" status="New"        delay="850ms" />
        </FeatureSection>

        {/* ── Divider ── */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="h-px bg-white/10" />
        </div>

        {/* ── Section 02: Inbox ── */}
        <FeatureSection
          id="inbox"
          index="02"
          eyebrow="WhatsApp inbox"
          headline="Every reply, in one place."
          sub="Inbound WhatsApp messages land in a unified inbox. Reply directly, or use AI-suggested responses to move conversations forward fast."
          flip
        >
          <div className="text-[12px] font-mono text-[#F0501E] font-bold uppercase tracking-wider mb-4">Live conversation</div>
          <div className="space-y-3">
            <Bubble direction="out" text="Hi! We build fast, affordable websites for local businesses. Interested in a free demo?" delay="400ms" />
            <Bubble direction="in"  text="Yes, what's the pricing like?" delay="600ms" />
            <Bubble direction="out" text="Basic starts at ₹4,999. I can walk you through it in 10 minutes — when works for you?" delay="800ms" />
            <Bubble direction="in"  text="Tomorrow 3pm works" delay="1000ms" />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto reveal-child" style={{ transitionDelay: '1100ms' }}>
            {['Send Pricing', 'Schedule Call', 'Follow Up'].map((chip) => (
              <span key={chip} className="bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-full text-[11px] text-white font-medium whitespace-nowrap flex-shrink-0">
                {chip}
              </span>
            ))}
          </div>
        </FeatureSection>

        {/* ── Divider ── */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="h-px bg-white/10" />
        </div>

        {/* ── Section 03: Analytics ── */}
        <FeatureSection
          id="analytics"
          index="03"
          eyebrow="Performance analytics"
          headline="Numbers that matter."
          sub="Track message delivery, read rates, and reply rates in real time. See exactly where deals stall and optimise your outreach copy accordingly."
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 reveal-child" style={{ transitionDelay: '400ms' }}>
              {[
                { label: 'Messages Sent', value: '248' },
                { label: 'Replies',       value: '61' },
                { label: 'Clients',       value: '14' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div
                    className="text-[32px] tracking-tight text-white font-bold"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {m.value}
                  </div>
                  <div className="text-[10px] font-mono text-[#F0501E] font-bold uppercase tracking-wider mt-1">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-2">
              <MetricBar label="Delivery rate" pct={94} delay="550ms" />
              <MetricBar label="Read rate"     pct={72} delay="700ms" />
              <MetricBar label="Reply rate"    pct={24} delay="850ms" />
              <MetricBar label="Close rate"    pct={9}  delay="1000ms" />
            </div>
          </div>
        </FeatureSection>

        {/* ── Divider ── */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="h-px bg-white/10" />
        </div>

        {/* ── Final CTA ── */}
        <CtaSection onEnterApp={onEnterApp} />
      </div>
    </>
  );
}
