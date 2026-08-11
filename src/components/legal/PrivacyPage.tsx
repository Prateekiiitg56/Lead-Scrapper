import { useNavigate, Link } from 'react-router-dom';
import { Layers, ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { AlmoayyedGradient } from '@/components/common/AlmoayyedGradient';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#D7D5D5] font-sans text-[#14161A] select-none overflow-x-hidden">
      {/* Bloom Field Animated Mesh Gradient Background */}
      <AlmoayyedGradient opacity={0.75} />

      {/* Edge-to-Edge Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Navigation */}
        <header className="px-6 lg:px-12 py-6 border-b border-white/10 flex items-center justify-between bg-[#080a0c]/80 backdrop-blur-md sticky top-0 z-50">
          <div
            onClick={() => navigate('/hero')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F0501E] text-white flex items-center justify-center shadow-md shadow-[#F0501E]/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[22px] font-sans font-bold text-white tracking-tight">
              Lead-Scrapper
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[13px] text-white/80 hover:text-white flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 hover:border-white/40 transition-all font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <Link
              to="/login"
              className="bg-[#F0501E] hover:bg-[#F0501E]/90 text-white text-[13px] font-bold px-5 py-2 rounded-full shadow-md transition-all cursor-pointer"
            >
              Launch Dashboard
            </Link>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-10 animate-blur-fade-up">
          {/* Header Badge */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold bg-[#F0501E]/15 border border-[#F0501E]/40 text-[#F0501E]">
              <ShieldCheck className="w-4 h-4" />
              <span>SaaS Compliance & Security</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="text-[14px] text-white/70 font-mono">
              Last updated: August 7, 2026 • Version 2.4 (Production Certified)
            </p>
          </div>

          {/* Key Commitments Box */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 space-y-4 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#F0501E]" />
              <span>Our Core Data Privacy Guarantees</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-white/80">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Zero selling of personal lead data</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Meta WhatsApp Cloud API Certified</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>AES-256 Encrypted Storage (Supabase)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>GDPR & CCPA Compliant Data Controls</span>
              </div>
            </div>
          </div>

          {/* Detailed Policy Sections */}
          <div className="space-y-8 text-[14px] text-white/80 leading-relaxed font-sans">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>1. Overview & Scope</span>
              </h2>
              <p>
                Lead-Scrapper ("we", "our", or "us") respects your privacy and is committed to protecting the personal data of our users, business prospects, and partners. This Privacy Policy describes how Lead-Scrapper collects, uses, stores, and processes information when you use our automated lead discovery platform, Meta WhatsApp integration tools, and dashboard services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>2. Data We Collect</span>
              </h2>
              <p>
                To provide our automated lead scraping and WhatsApp message dispatch services, we collect:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li><strong>Account Credentials:</strong> Email address (Gmail), password hashes, and profile details provided during registration via Supabase Authentication.</li>
                <li><strong>Prospect & Lead Data:</strong> Business names, public phone numbers, Google Maps location data, business category classifications, and website URLs.</li>
                <li><strong>Communication Logs:</strong> Outbound and inbound WhatsApp message history, message delivery statuses (Sent, Delivered, Read), and AI intent/sentiment classifications.</li>
                <li><strong>Usage & Telemetry:</strong> Log files, search queries, pagination metrics, and browser/device metadata.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>3. Meta WhatsApp API & Third-Party Integration</span>
              </h2>
              <p>
                Lead-Scrapper integrates directly with official Graph Meta Cloud APIs and automated Webhook pipelines (n8n). All WhatsApp communication adheres strictly to Meta's Business Messaging Policies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li>We do not store plain-text WhatsApp authentication tokens on client devices.</li>
                <li>Messages sent via template endpoints adhere to Meta pre-approved message guidelines.</li>
                <li>Recipient phone numbers are formatted and transmitted strictly for message delivery.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>4. How We Use Your Data</span>
              </h2>
              <p>We process collected data exclusively for the following operational purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li>Executing user-initiated search campaigns for local business discovery.</li>
                <li>Calculating messaging unit costs (₹0.80 / msg) and maintaining account usage records.</li>
                <li>Providing AI-assisted sentiment analysis and automated conversation summaries in the Inbox.</li>
                <li>Preventing spam, fraud, and unauthorized platform abuse.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>5. Data Retention & Deletion</span>
              </h2>
              <p>
                You retain full control over your lead records and account data. When you delete a lead or request account termination, all corresponding records in our database (Supabase) are permanently erased within 24 hours.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>6. Contact & Data Protection Officer</span>
              </h2>
              <p>
                If you have questions regarding this Privacy Policy or wish to exercise your GDPR/CCPA rights, please contact our compliance team:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-[13px] font-mono text-white/90">
                Email: support@lead-scrapper.ai • Compliance DPO: privacy@lead-scrapper.ai
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-between text-[12px] text-white/50">
            <span>© 2026 Lead-Scrapper Inc. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
