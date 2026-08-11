import { useNavigate, Link } from 'react-router-dom';
import { Layers, ArrowLeft, FileText, Scale, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AlmoayyedGradient } from '@/components/common/AlmoayyedGradient';

export function TermsPage() {
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
              <Scale className="w-4 h-4" />
              <span>SaaS Legal Terms & Usage Agreement</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-white">
              Terms of Service
            </h1>
            <p className="text-[14px] text-white/70 font-mono">
              Last updated: August 7, 2026 • Effective Version 3.1
            </p>
          </div>

          {/* Key Terms Summary Box */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 space-y-4 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F0501E]" />
              <span>Summary of Essential Service Rules</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-white/80">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Strict Anti-Spam & Opt-in Policy</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unit Rate: ₹0.80 per WhatsApp message</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>User control over manual message dispatches</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>99.9% Uptime & Enterprise SLA Support</span>
              </div>
            </div>
          </div>

          {/* Detailed Terms Sections */}
          <div className="space-y-8 text-[14px] text-white/80 leading-relaxed font-sans">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>1. Acceptance of Terms</span>
              </h2>
              <p>
                By creating an account, accessing the Lead-Scrapper platform, or invoking our Meta WhatsApp API integration tools, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>2. Authorized Platform Usage & Anti-Spam Policy</span>
              </h2>
              <p>
                Lead-Scrapper provides tools for local business lead generation and AI outreach automation. Users agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white/70">
                <li>Comply with Meta Business Messaging Policies, WhatsApp Terms of Service, and local telecommunication regulations.</li>
                <li>Refrain from sending unsolicited bulk spam, deceptive offers, or illegal communications.</li>
                <li>Honor opt-out and unsubscribe requests immediately when communicated by recipients.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>3. Billing, Unit Rates & Costs</span>
              </h2>
              <p>
                Outbound WhatsApp message dispatches incur a calculated unit cost of <strong>₹0.80 per message</strong>. Users are responsible for all message charges initiated through their account credentials. Platform usage fees are billed in accordance with the selected plan.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>4. Intellectual Property & Data Ownership</span>
              </h2>
              <p>
                You retain complete ownership over the lead data, custom notes, and campaign templates created within your Lead-Scrapper workspace. Lead-Scrapper retains ownership of platform software, AI models, and UI components.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>5. Limitation of Liability</span>
              </h2>
              <p>
                To the maximum extent permitted by law, Lead-Scrapper shall not be liable for indirect, incidental, or consequential damages resulting from third-party API downtime (e.g. Meta Cloud API, Google Places API), account suspension by Meta due to policy violations, or loss of business prospects.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>6. Termination & Contact</span>
              </h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate our Anti-Spam policy or Meta WhatsApp guidelines. For questions regarding these Terms, contact legal support:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-[13px] font-mono text-white/90">
                Legal Desk: legal@lead-scrapper.ai • Support: support@lead-scrapper.ai
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-between text-[12px] text-white/50">
            <span>© 2026 Lead-Scrapper Inc. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
