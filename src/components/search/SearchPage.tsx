import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Phone,
  Star,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  ChevronDown,
  Check,
  Filter,
  Mail,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  searchLeads,
  sendWhatsAppMessage,
  sendColdEmail,
  generateAIEmail,
  fetchStats,
} from '@/services/searchService';
import { BUSINESS_TYPES, EMAIL_TEMPLATES } from '@/lib/constants';
import type { EmailTemplateId } from '@/lib/constants';
import { useCountUp } from '@/hooks/useCountUp';
import { useAuth } from '@/hooks/useAuth';
import { isOutreachAuthorized } from '@/services/permissionService';
import { OutreachModal } from '@/components/common/OutreachModal';
import { OutreachPermissionModal } from '@/components/common/OutreachPermissionModal';
import type { SearchLead } from '@/types/api';

function formatWebsiteUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="quiet-input bg-[#f8f9fc] border-[#d1d5db] text-[#14161A] flex items-center justify-between text-left cursor-pointer font-bold w-full"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`w-4 h-4 text-[#374151] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180 text-[#14161A]' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#d1d5db] rounded-[16px] py-1.5 z-50 animate-fade-in shadow-xl max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between transition-colors cursor-pointer ${
                value === opt
                  ? 'bg-[#e8eaf0] text-[#F0501E] font-bold'
                  : 'text-[#374151] hover:text-[#14161A] hover:bg-gray-100 font-medium'
              }`}
            >
              <span>{opt}</span>
              {value === opt && <Check className="w-3.5 h-3.5 text-[#F0501E]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsAppLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.928 0-3.816-.518-5.46-1.499l-.392-.232-4.058 1.064 1.083-3.957-.254-.405c-1.077-1.714-1.646-3.708-1.646-5.751 0-5.967 4.854-10.821 10.827-10.821 2.893 0 5.612 1.128 7.658 3.175 2.046 2.046 3.172 4.767 3.171 7.66 0 5.968-4.854 10.824-10.827 10.824m0-19.646c-4.857 0-8.824 3.967-8.824 8.822 0 1.954.641 3.76 1.737 5.228l-.208.332-1.144 4.18 4.275-1.121.32.19c1.416.84 3.056 1.284 4.844 1.284 4.857 0 8.824-3.967 8.824-8.822.001-4.856-3.966-8.823-8.824-8.823" />
    </svg>
  );
}

function GmailLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22 6c0-.83-.67-1.5-1.5-1.5H18v7l4-3V6z" />
      <path fill="#34A853" d="M2 6v2.5l4 3V4.5H3.5C2.67 4.5 2 5.17 2 6z" />
      <path fill="#EA4335" d="M18 4.5h2.5c.83 0 1.5.67 1.5 1.5v.5L12 14 2 6.5V6c0-.83.67-1.5 1.5-1.5H6l6 4.5 6-4.5z" />
      <path fill="#FBBC04" d="M2 8.5V18c0 .83.67 1.5 1.5 1.5H6v-8l-4-3z" />
      <path fill="#4285F4" d="M18 11.5v8h2.5c.83 0 1.5-.67 1.5-1.5V8.5l-4 3z" />
    </svg>
  );
}

function LinkedInLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function WandIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 4-2 2 4 4 2-2a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0Z" />
      <path d="m11 8-7.5 7.5a2.12 2.12 0 0 0 3 3L14 11" />
      <path d="M18 16v2" />
      <path d="M17 17h2" />
      <path d="M9 3v2" />
      <path d="M8 4h2" />
    </svg>
  );
}

function SearchResultCard({
  lead,
  isTarget,
  userEmail,
  userId,
  businessType,
  onRequestPermission,
  onSentSuccess,
}: {
  lead: SearchLead;
  isTarget: boolean;
  userEmail?: string | null;
  userId?: string;
  businessType: string;
  onRequestPermission: () => void;
  onSentSuccess: () => void;
}) {
  const websiteUrl = formatWebsiteUrl(lead.website);
  const defaultMode = websiteUrl ? 'website_pitch' : 'template';

  // Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);

  // WhatsApp composer state
  const [sendMode, setSendMode] = useState<'website_pitch' | 'template'>(defaultMode);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email composer state
  const [emailTemplateId, setEmailTemplateId] = useState<EmailTemplateId>(EMAIL_TEMPLATES[0].id);
  const [targetEmailInput, setTargetEmailInput] = useState(lead.email || '');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // AI personalized email state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSubject, setAiSubject] = useState('');
  const [aiBody, setAiBody] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);

  // LinkedIn URL input state
  const [linkedinUrlInput, setLinkedinUrlInput] = useState(lead.linkedin_url || '');

  const isAITemplate = emailTemplateId === 'ai_personalized_email';

  // Keyboard escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWhatsAppModal(false);
        setShowEmailModal(false);
        setShowLinkedInModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGenerateAI = async () => {
    setAiGenerating(true);
    setEmailErrorMsg(null);
    try {
      const result = await generateAIEmail({
        businessName: lead.name,
        businessType,
        address: lead.address,
        website: lead.website || undefined,
        rating: lead.rating || undefined,
      });
      setAiSubject(result.subject);
      setAiBody(result.body);
      setAiGenerated(true);
    } catch (err) {
      setEmailErrorMsg(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleOpenWhatsAppModal = () => {
    if (!isOutreachAuthorized(userEmail)) {
      onRequestPermission();
      return;
    }
    setShowWhatsAppModal(true);
    setErrorMsg(null);
  };

  const handleOpenEmailModal = () => {
    setShowEmailModal(true);
    setEmailErrorMsg(null);
  };

  const handleLinkedInClick = () => {
    const savedUrl = lead.linkedin_url || linkedinUrlInput;
    if (savedUrl && savedUrl.trim()) {
      const url = savedUrl.startsWith('http') ? savedUrl : `https://${savedUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setShowLinkedInModal(true);
    }
  };

  const handleDispatchWhatsApp = async () => {
    if (!isOutreachAuthorized(userEmail)) {
      onRequestPermission();
      return;
    }

    setSending(true);
    setErrorMsg(null);
    try {
      if (sendMode === 'website_pitch') {
        const res = await sendWhatsAppMessage(
          lead.name,
          lead.phone,
          lead.address,
          lead.website,
          'website_automation_pitch_v2',
          userEmail,
          userId
        );
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await sendWhatsAppMessage(
          lead.name,
          lead.phone,
          lead.address,
          lead.website,
          'first_outreach',
          userEmail,
          userId
        );
        if (!res.success) throw new Error(res.message);
      }
      setSent(true);
      setShowWhatsAppModal(false);
      onSentSuccess();
    } catch (err) {
      if (err instanceof Error && err.message.includes('PERMISSION_RESTRICTED')) {
        onRequestPermission();
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Message send failed');
      }
    } finally {
      setSending(false);
    }
  };

  const handleDispatchEmail = async () => {
    const emailToSend = targetEmailInput.trim();
    if (!emailToSend) {
      setEmailErrorMsg('Please enter a recipient email address.');
      return;
    }

    if (isAITemplate && !aiGenerated) {
      setEmailErrorMsg('Please click "Draft with AI" first before sending.');
      return;
    }

    setEmailSending(true);
    setEmailErrorMsg(null);
    try {
      const res = await sendColdEmail(
        lead.name,
        emailToSend,
        lead.address,
        lead.website,
        isAITemplate ? 'first_outreach_email' : emailTemplateId,
        userEmail,
        userId,
        isAITemplate ? aiSubject : undefined,
        isAITemplate ? aiBody : undefined,
        businessType
      );
      if (!res.success) throw new Error(res.message);
      setEmailSent(true);
      setShowEmailModal(false);
      onSentSuccess();
    } catch (err) {
      if (err instanceof Error && err.message.includes('PERMISSION_RESTRICTED')) {
        onRequestPermission();
      } else {
        setEmailErrorMsg(err instanceof Error ? err.message : 'Email send failed');
      }
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="ui-card flex flex-col justify-between h-full space-y-4 hover:-translate-y-1 hover:shadow-md hover:border-[#F0501E]/30 transition-all duration-200">
      {/* Top Details Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 min-h-[44px] flex flex-col justify-center">
            <h3 className="text-[16px] font-bold text-[#14161A] leading-snug line-clamp-2" title={lead.name}>
              {lead.name}
            </h3>
          </div>
          {isTarget ? (
            <span className="badge-target flex-shrink-0 mt-0.5">
              Target (No Website)
            </span>
          ) : (
            <span className="badge-has-website flex-shrink-0 mt-0.5">
              Has Website
            </span>
          )}
        </div>

        {/* Lead Metadata */}
        <div className="space-y-2 text-[13px] text-[#4B5264] font-medium border-t border-[#E2E8F0] pt-3">
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" />
              <span className="font-mono text-[13px] font-bold text-[#14161A]">{lead.phone}</span>
            </div>
          )}

          {/* Email or Add Email Clickable Affordance */}
          {lead.email ? (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" />
              <span className="font-mono text-[13px] font-bold text-[#14161A] truncate max-w-[240px]" title={lead.email}>
                {lead.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#8A90A2] flex-shrink-0" />
              <button
                onClick={handleOpenEmailModal}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8A90A2] hover:text-[#F0501E] border border-dashed border-[#D1D5DB] hover:border-[#F0501E]/50 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
              >
                + Add email
              </button>
            </div>
          )}

          {websiteUrl && (
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#4B5264] flex-shrink-0" />
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[13px] text-[#F0501E] hover:underline font-bold transition-colors truncate max-w-[240px]"
                title={lead.website}
              >
                {lead.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {lead.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#8A90A2] flex-shrink-0 mt-0.5" />
              <span className="text-[#4B5264] line-clamp-2 text-[12px] font-sans">{lead.address}</span>
            </div>
          )}

          {/* Quieter Inline Rating Style */}
          {lead.rating && (
            <div className="flex items-center gap-1.5 pt-0.5 font-mono text-[12px] text-[#4B5264]">
              <span className="text-amber-600 font-bold">★</span>
              <span className="font-bold text-[#14161A]">{lead.rating}</span>
              <span className="text-[#8A90A2]">· 5.0 Google</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 36px Icon Button Row */}
      <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* WhatsApp Icon Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleOpenWhatsAppModal}
              className={`w-9 h-9 rounded-full bg-white border border-[#E2E8F0] hover:border-[#D1D5DB] hover:bg-slate-50 hover:-translate-y-0.5 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer text-[#25D366] ${
                sent ? 'ring-2 ring-emerald-500/40' : ''
              }`}
              aria-label="WhatsApp Outreach"
            >
              {sent ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <WhatsAppLogo className="w-4 h-4 text-[#25D366]" />}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#17192B] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
              {sent ? 'WhatsApp Sent' : 'WhatsApp'}
            </div>
          </div>

          {/* Email Icon Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleOpenEmailModal}
              className={`w-9 h-9 rounded-full bg-white border border-[#E2E8F0] hover:border-[#D1D5DB] hover:bg-slate-50 hover:-translate-y-0.5 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer ${
                emailSent ? 'ring-2 ring-emerald-500/40' : ''
              }`}
              aria-label="Email Outreach"
            >
              {emailSent ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <GmailLogo className="w-4 h-4" />}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#17192B] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
              {emailSent ? 'Email Sent' : 'Email'}
            </div>
          </div>

          {/* LinkedIn Icon Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleLinkedInClick}
              className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] hover:border-[#D1D5DB] hover:bg-slate-50 hover:-translate-y-0.5 shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer text-[#0A66C2]"
              aria-label="LinkedIn Profile"
            >
              <LinkedInLogo className="w-4 h-4 text-[#0A66C2]" />
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#17192B] text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
              LinkedIn
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {(sent || emailSent) && (
          <span className="text-[11px] font-mono font-medium text-emerald-700 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Contacted
          </span>
        )}
      </div>

      {/* ── WHATSAPP OUTREACH MODAL DIALOG ── */}
      <OutreachModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        icon={<WhatsAppLogo className="w-5 h-5 text-[#25D366]" />}
        title="WhatsApp Outreach"
        businessName={lead.name}
        footer={
          <>
            <button type="button" onClick={() => setShowWhatsAppModal(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDispatchWhatsApp}
              disabled={sending}
              className="btn-primary"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Template Tabs */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
              Outreach Template
            </label>
            <div className="flex items-center gap-2 bg-[#F4F5F8] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSendMode('website_pitch')}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all text-center cursor-pointer ${
                  sendMode === 'website_pitch' ? 'bg-white text-[#F0501E] shadow-xs' : 'text-[#4B5264] hover:text-[#14161A]'
                }`}
              >
                Website Pitch
              </button>
              <button
                type="button"
                onClick={() => setSendMode('template')}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all text-center cursor-pointer ${
                  sendMode === 'template' ? 'bg-white text-[#F0501E] shadow-xs' : 'text-[#4B5264] hover:text-[#14161A]'
                }`}
              >
                Standard Outreach
              </button>
            </div>
          </div>

          {/* Preview Box */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
              Template Preview
            </label>
            <div className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-[16px] p-4 text-[13px] text-[#4B5264] space-y-2 font-sans max-h-[160px] overflow-y-auto overflow-x-hidden">
              <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]/60">
                <span className="font-bold text-[#14161A] text-[12px]">Message Body</span>
                <span className="badge-success text-[10px]">Meta Approved</span>
              </div>
              <p className="italic text-[#14161A] leading-relaxed whitespace-pre-wrap break-all overflow-wrap-anywhere">
                {sendMode === 'website_pitch'
                  ? `"Hi ${lead.name}, I checked out your website (${lead.website || 'your website'})! We build custom AI automations for businesses like yours..."`
                  : `"Hello ${lead.name}, we came across your business listing in ${lead.address || 'your local area'} and wanted to connect..."`}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-[#FEF2F2] border border-red-200 text-[#DC2626] p-3.5 rounded-xl text-[12px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </OutreachModal>

      {/* ── EMAIL OUTREACH MODAL DIALOG ── */}
      <OutreachModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        icon={<GmailLogo className="w-5 h-5" />}
        title="Email Composer"
        businessName={lead.name}
        footer={
          <>
            <button type="button" onClick={() => setShowEmailModal(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDispatchEmail}
              disabled={emailSending || (isAITemplate && !aiGenerated)}
              className="btn-primary"
            >
              {emailSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Recipient Email Input */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
              Recipient Email
            </label>
            <input
              type="email"
              value={targetEmailInput}
              onChange={(e) => setTargetEmailInput(e.target.value)}
              placeholder="e.g. contact@business.com"
              className="ui-input font-mono text-[13px] w-full"
            />
          </div>

          {/* Template Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
              Email Template
            </label>
            <select
              value={emailTemplateId}
              onChange={(e) => {
                setEmailTemplateId(e.target.value as EmailTemplateId);
                setAiGenerated(false);
                setAiBody('');
                setAiSubject('');
              }}
              className="ui-input font-sans text-[13px] w-full cursor-pointer"
            >
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Draft Section */}
          {isAITemplate && (
            <div className="space-y-4 pt-1">
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={aiGenerating}
                className="w-full py-2.5 px-4 rounded-full border border-[#F0501E] text-[#F0501E] hover:bg-[#FDEDE7]/50 font-bold text-[13px] inline-flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Draft...</span>
                  </>
                ) : (
                  <>
                    <WandIcon className="w-4 h-4" />
                    <span>Draft with AI</span>
                  </>
                )}
              </button>

              {aiGenerated && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#0F9D58] font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> AI Draft Generated
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={aiSubject}
                      onChange={(e) => setAiSubject(e.target.value)}
                      className="ui-input font-bold text-[13px] w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
                      Email Body
                    </label>
                    <textarea
                      value={aiBody}
                      onChange={(e) => setAiBody(e.target.value)}
                      rows={6}
                      className="ui-input font-sans text-[13px] leading-relaxed resize-y w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {emailErrorMsg && (
            <div className="bg-[#FEF2F2] border border-red-200 text-[#DC2626] p-3.5 rounded-xl text-[12px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              <span>{emailErrorMsg}</span>
            </div>
          )}
        </div>
      </OutreachModal>

      {/* ── LINKEDIN MODAL DIALOG ── */}
      <OutreachModal
        isOpen={showLinkedInModal}
        onClose={() => setShowLinkedInModal(false)}
        icon={<LinkedInLogo className="w-5 h-5 text-[#0A66C2]" />}
        title="LinkedIn Profile"
        businessName={lead.name}
        footer={
          <>
            <button type="button" onClick={() => setShowLinkedInModal(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkedInModal(false);
                const savedUrl = linkedinUrlInput.trim();
                if (savedUrl) {
                  const url = savedUrl.startsWith('http') ? savedUrl : `https://${savedUrl}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                  const searchQuery = encodeURIComponent(lead.name);
                  window.open(`https://www.linkedin.com/search/results/all/?keywords=${searchQuery}`, '_blank', 'noopener,noreferrer');
                }
              }}
              className="btn-primary"
            >
              <span>Open LinkedIn</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#4B5264] mb-2 block font-sans">
              LinkedIn Profile URL
            </label>
            <input
              type="text"
              value={linkedinUrlInput}
              onChange={(e) => setLinkedinUrlInput(e.target.value)}
              placeholder="e.g. linkedin.com/in/prospect-name"
              className="ui-input font-mono text-[13px] w-full"
            />
            <p className="text-[12px] text-[#8A90A2] mt-2 leading-normal font-sans">
              Leave empty to perform an automatic search for this business on LinkedIn.
            </p>
          </div>
        </div>
      </OutreachModal>
    </div>
  );
}

export function SearchPage() {
  const { user } = useAuth();
  const [businessType, setBusinessType] = useState<string>(BUSINESS_TYPES[0]);
  const [businessTypeOther, setBusinessTypeOther] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<SearchLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterChip, setFilterChip] = useState<'all' | 'no_website' | 'has_website'>('all');
  const [stats, setStats] = useState<{ sent_this_month: number; total_logged: number } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const countSent = useCountUp(stats?.sent_this_month ?? 0);
  const countTotal = useCountUp(stats?.total_logged ?? 0);

  const handleSearch = async () => {
    if (!location.trim()) return;
    setSearching(true);
    setError(null);
    setLeads(null);
    try {
      const result = await searchLeads(businessType, businessTypeOther, location);
      setLeads(result.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const noWebsiteLeads = leads?.filter((l) => l.has_website !== 'true') || [];
  const hasWebsiteLeads = leads?.filter((l) => l.has_website === 'true') || [];

  const displayLeads = leads?.filter((l) => {
    if (filterChip === 'no_website') return l.has_website !== 'true';
    if (filterChip === 'has_website') return l.has_website === 'true';
    return true;
  }) || [];

  return (
    <div className="relative p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 font-sans text-[#14161A] select-none bg-transparent">
      {/* Header & Stats Banner */}
      <div className="bg-[#E8EAF0] rounded-[24px] p-6 lg:p-8 border border-[#D1D5DB] shadow-xs space-y-6 animate-blur-fade-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D1D5DB] pb-5">
          <div>
            <div className="eyebrow text-[#4B5264] mb-1">Google Places Discovery</div>
            <h1 className="text-display-lg text-[#14161A] tracking-tight">
              Search & Contact Leads
            </h1>
          </div>

          {stats && (
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-[16px] px-5 py-3 text-center border border-[#E2E8F0] shadow-xs min-w-[130px]">
                <div className="text-display text-[28px] text-[#14161A]">
                  {countSent}
                </div>
                <div className="eyebrow mt-0.5 text-[#4B5264] text-[10px]">Sent this month</div>
              </div>
              <div className="bg-white rounded-[16px] px-5 py-3 text-center border border-[#E2E8F0] shadow-xs min-w-[130px]">
                <div className="text-display text-[28px] text-[#14161A]">
                  {countTotal}
                </div>
                <div className="eyebrow mt-0.5 text-[#4B5264] text-[10px]">Total logged</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Two-Column Main Workspace Layout ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ── Left Sticky Sidebar (Filter Controls) ── */}
          <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-6 space-y-5 ui-card">
            <div className="eyebrow text-[#F0501E] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Filter className="w-4 h-4 text-[#F0501E]" />
              <span>Discovery Filters</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="eyebrow text-[#4B5264] block mb-2">Business Category</label>
                <CustomSelect
                  value={businessType}
                  onChange={(val) => setBusinessType(val)}
                  options={BUSINESS_TYPES}
                />
              </div>

              {businessType === 'Other' && (
                <div className="animate-fade-in">
                  <label className="eyebrow text-[#4B5264] block mb-2">Specify Custom Category</label>
                  <input
                    value={businessTypeOther}
                    onChange={(e) => setBusinessTypeOther(e.target.value)}
                    className="quiet-input"
                    placeholder="e.g. pet groomer"
                  />
                </div>
              )}

              <div>
                <label className="eyebrow text-[#4B5264] block mb-2">City / Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="quiet-input"
                  placeholder="e.g. San Francisco, CA or New York, NY"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* Primary CTA Search Button */}
              <button
                onClick={handleSearch}
                disabled={searching}
                className="btn-primary w-full py-3.5 mt-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Scraping Places...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-white" />
                    <span>Discover Leads</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Right Content Workspace (Results & Grid) ── */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Search Error Notice */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-[20px] p-4 text-[13px] flex items-center gap-3 animate-fade-in font-medium">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <span className="font-bold">Search Error: </span>
                  {error}
                </div>
              </div>
            )}

            {/* Results Grid View */}
            {leads ? (
              <div className="space-y-5 animate-blur-fade-up">
                {/* Results Header Toolbar & Filter Chips */}
                <div className="bg-white rounded-[20px] p-4 border border-[#d1d5db] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-[#14161A]">Search Results</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#17192B] text-white font-mono">
                      {leads.length} leads found
                    </span>
                  </div>

                  {/* Filter Chips Bar */}
                  <div className="flex items-center gap-1.5 bg-[#f1f5f9] p-1 rounded-xl border border-[#cbd5e1] self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilterChip('all')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        filterChip === 'all'
                          ? 'bg-white text-[#14161A] shadow-xs'
                          : 'text-[#64748b] hover:text-[#1e293b]'
                      }`}
                    >
                      All ({leads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterChip('no_website')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        filterChip === 'no_website'
                          ? 'bg-white text-[#F0501E] shadow-xs'
                          : 'text-[#64748b] hover:text-[#1e293b]'
                      }`}
                    >
                      No Website ({noWebsiteLeads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterChip('has_website')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        filterChip === 'has_website'
                          ? 'bg-white text-[#14161A] shadow-xs'
                          : 'text-[#64748b] hover:text-[#1e293b]'
                      }`}
                    >
                      Has Website ({hasWebsiteLeads.length})
                    </button>
                  </div>
                </div>

                {/* Grid of Lead Cards (1 col mobile, 2 col md, 3 col xl) */}
                {displayLeads.length === 0 ? (
                  <div className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center text-[#475569] font-bold text-[14px]">
                    No leads match the selected filter chip.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {displayLeads.map((lead, idx) => (
                      <SearchResultCard
                        key={lead.place_id || lead.google_place_id || `${lead.name}-${idx}`}
                        lead={lead}
                        isTarget={lead.has_website !== 'true'}
                        userEmail={user?.email}
                        userId={user?.id}
                        businessType={businessType === 'Other' && businessTypeOther ? businessTypeOther : businessType}
                        onRequestPermission={() => setShowPermissionModal(true)}
                        onSentSuccess={() => fetchStats().then(setStats).catch(() => {})}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Initial Empty State before search */
              <div className="bg-white border border-[#d1d5db] rounded-[24px] p-12 text-center text-[#475569] space-y-3 shadow-xs">
                <Search className="w-10 h-10 mx-auto text-[#94a3b8]" />
                <h3 className="text-lg font-bold text-[#14161A]">Ready to Discover Local Leads</h3>
                <p className="text-[13px] text-[#64748b] max-w-md mx-auto">
                  Select a business category and enter a target city on the left sidebar to scrape verified local leads via Google Places.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outreach Permission Restriction Modal */}
      {showPermissionModal && (
        <OutreachPermissionModal
          userEmail={user?.email}
          onClose={() => setShowPermissionModal(false)}
        />
      )}
    </div>
  );
}
