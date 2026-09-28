import { useState, useEffect, useMemo, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, Phone, MapPin, Loader2, CheckCircle2, AlertCircle, Globe, Check, Filter, Mail, BookmarkPlus, X } from 'lucide-react';
import {
  searchLeads,
  sendWhatsAppTemplate,
  sendColdEmail,
  generateAIEmail,
  isValidEmail,
  PermissionError,
  type OutreachResult,
  type SearchResult,
  type WhatsAppTemplate,
} from '@/services/searchService';
import { normalizePhone, normalizeEmail, saveLeadForUser } from '@/services/leadService';
import { fetchOutreachStats } from '@/services/conversationService';
import { fetchGmailStatus, isGmailNotConnected, startGmailConnect } from '@/services/gmailService';
import { BUSINESS_TYPES, EMAIL_TEMPLATES, STATUS_LABELS, type EmailTemplateId } from '@/lib/constants';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, toExternalUrl } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { isOutreachAuthorized } from '@/services/permissionService';
import { OutreachModal } from '@/components/common/OutreachModal';
import { LinkedInLogo } from '@/components/common/LinkedInLogo';
import { OutreachPermissionModal } from '@/components/common/OutreachPermissionModal';
import type { SearchLead } from '@/types/api';
import type { Lead } from '@/types/database';

type Channel = 'whatsapp' | 'email' | 'linkedin';
type ChipFilter = 'all' | 'no_website' | 'has_website';

interface SavedSearch {
  query: { type: string; location: string };
  result: SearchResult;
}

/**
 * The last search is kept for the tab session, per user, so leaving the page does not throw
 * away results that cost Google Places calls to produce.
 */
function readSavedSearch(key: string): SavedSearch | null {
  try {
    const raw = sessionStorage.getItem(key);
    const saved = raw ? (JSON.parse(raw) as SavedSearch) : null;
    return Array.isArray(saved?.result?.leads) ? saved : null;
  } catch {
    return null;
  }
}

function writeSavedSearch(key: string, saved: SavedSearch) {
  try {
    sessionStorage.setItem(key, JSON.stringify(saved));
  } catch { /* storage unavailable or full */ }
}

function leadKey(lead: SearchLead): string {
  return lead.place_id || normalizePhone(lead.phone) || `${lead.name}|${lead.address}`.toLowerCase();
}


function WhatsAppLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.928 0-3.816-.518-5.46-1.499l-.392-.232-4.058 1.064 1.083-3.957-.254-.405c-1.077-1.714-1.646-3.708-1.646-5.751 0-5.967 4.854-10.821 10.827-10.821 2.893 0 5.612 1.128 7.658 3.175 2.046 2.046 3.172 4.767 3.171 7.66 0 5.968-4.854 10.824-10.827 10.824m0-19.646c-4.857 0-8.824 3.967-8.824 8.822 0 1.954.641 3.76 1.737 5.228l-.208.332-1.144 4.18 4.275-1.121.32.19c1.416.84 3.056 1.284 4.844 1.284 4.857 0 8.824-3.967 8.824-8.822.001-4.856-3.966-8.823-8.824-8.823" />
    </svg>
  );
}

function GmailLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22 6c0-.83-.67-1.5-1.5-1.5H18v7l4-3V6z" />
      <path fill="#34A853" d="M2 6v2.5l4 3V4.5H3.5C2.67 4.5 2 5.17 2 6z" />
      <path fill="#EA4335" d="M18 4.5h2.5c.83 0 1.5.67 1.5 1.5v.5L12 14 2 6.5V6c0-.83.67-1.5 1.5-1.5H6l6 4.5 6-4.5z" />
      <path fill="#FBBC04" d="M2 8.5V18c0 .83.67 1.5 1.5 1.5H6v-8l-4-3z" />
      <path fill="#4285F4" d="M18 11.5v8h2.5c.83 0 1.5-.67 1.5-1.5V8.5l-4 3z" />
    </svg>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="bg-[#FEF2F2] border border-red-200 text-[#B91C1C] p-3.5 rounded-xl text-[12px] font-medium flex items-start gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#374151] mb-2 block">
      {children}
    </label>
  );
}

/* ─────────────────────────── Result card ─────────────────────────── */

function SearchResultCard({
  lead,
  crmLead,
  contacted,
  saving,
  saveError,
  onSave,
  onOutreach,
}: {
  lead: SearchLead;
  crmLead: Lead | undefined;
  contacted: { whatsapp?: boolean; email?: boolean };
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onOutreach: (channel: Channel) => void;
}) {
  const websiteUrl = toExternalUrl(lead.website);
  const hasPhone = !!normalizePhone(lead.phone);
  const canSave = hasPhone || !!lead.email;

  const iconBtn =
    'w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-white border border-[#E2E8F0] hover:border-[#D1D5DB] hover:bg-slate-50 shadow-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <article className="ui-card flex flex-col justify-between h-full gap-4 hover:shadow-md hover:border-[#F0501E]/30 !p-5" aria-label={lead.name}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold text-[#14161A] leading-snug line-clamp-2 min-w-0" title={lead.name}>{lead.name}</h3>
          <span className={`flex-shrink-0 mt-0.5 ${lead.has_website ? 'badge-has-website' : 'badge-target'}`}>
            {lead.has_website ? 'Has website' : 'No website'}
          </span>
        </div>

        <dl className="space-y-2 text-[13px] text-[#374151] font-medium border-t border-[#E2E8F0] pt-3">
          <div className="flex items-center gap-2">
            <dt><Phone className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Phone" /></dt>
            <dd className={hasPhone ? 'font-mono font-bold text-[#14161A]' : 'text-[#4B5264] italic'}>{lead.phone || 'No phone listed'}</dd>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <dt><Mail className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Email" /></dt>
            <dd className="min-w-0">
              {lead.email ? (
                <span className="font-mono font-bold text-[#14161A] truncate block" title={lead.email}>{lead.email}</span>
              ) : (
                <button type="button" onClick={() => onOutreach('email')} className="text-[12px] font-mono text-[#4B5264] hover:text-[#B93A0E] border border-dashed border-[#9CA3AF] px-2 py-0.5 rounded-full cursor-pointer">
                  + Add email
                </button>
              )}
            </dd>
          </div>
          {websiteUrl && (
            <div className="flex items-center gap-2 min-w-0">
              <dt><Globe className="w-3.5 h-3.5 text-[#4B5264]" aria-label="Website" /></dt>
              <dd className="min-w-0">
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] text-[#B93A0E] hover:underline font-bold truncate block" title={lead.website}>
                  {lead.website.replace(/^https?:\/\//, '')}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          )}
          {lead.address && (
            <div className="flex items-start gap-2">
              <dt><MapPin className="w-3.5 h-3.5 text-[#4B5264] mt-0.5" aria-label="Address" /></dt>
              <dd className="line-clamp-2 text-[12px]">{lead.address}</dd>
            </div>
          )}
          {lead.rating != null && (
            <div className="flex items-center gap-1.5 font-mono text-[12px]">
              <dt className="text-amber-700 font-bold" aria-label="Google rating">★</dt>
              <dd><span className="font-bold text-[#14161A]">{lead.rating.toFixed(1)}</span> / 5 on Google</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-2.5">
        {saveError && <ErrorNote>{saveError}</ErrorNote>}
        <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOutreach('whatsapp')}
              disabled={!hasPhone}
              className={`${iconBtn} text-[#128C3F] ${contacted.whatsapp ? 'ring-2 ring-emerald-500/50' : ''}`}
              aria-label={hasPhone ? `WhatsApp ${lead.name}${contacted.whatsapp ? ' (sent)' : ''}` : 'WhatsApp unavailable: no phone number'}
              title={hasPhone ? 'WhatsApp' : 'No phone number'}
            >
              {contacted.whatsapp ? <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" /> : <WhatsAppLogo />}
            </button>
            <button
              type="button"
              onClick={() => onOutreach('email')}
              className={`${iconBtn} ${contacted.email ? 'ring-2 ring-emerald-500/50' : ''}`}
              aria-label={`Email ${lead.name}${contacted.email ? ' (sent)' : ''}`}
              title="Email"
            >
              {contacted.email ? <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" /> : <GmailLogo />}
            </button>
            <button type="button" onClick={() => onOutreach('linkedin')} className={`${iconBtn} text-[#0A66C2]`} aria-label={`LinkedIn for ${lead.name}`} title="LinkedIn">
              <LinkedInLogo />
            </button>
          </div>

          {crmLead ? (
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1" title="Already saved in your CRM">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              In CRM · {STATUS_LABELS[crmLead.status]}
            </span>
          ) : (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className="btn-secondary !py-1.5 !px-3 !text-[12px]"
              title={canSave ? 'Save to CRM' : 'Needs a phone number or email'}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />}
              Save
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────── Outreach dialogs ─────────────────────────── */

function WhatsAppDialog({ lead, businessType, onClose, onSent, onPermission }: { lead: SearchLead; businessType: string; onClose: () => void; onSent: (r: OutreachResult) => void; onPermission: () => void }) {
  const { user } = useAuth();
  const [template, setTemplate] = useState<WhatsAppTemplate>(lead.website ? 'website_automation_pitch_v2' : 'first_outreach');
  const send = useMutation({
    mutationFn: () => sendWhatsAppTemplate(lead, template, user!, businessType),
    onSuccess: onSent,
    onError: (err) => {
      if (err instanceof PermissionError) onPermission();
    },
  });

  return (
    <OutreachModal
      isOpen
      onClose={send.isPending ? () => {} : onClose}
      icon={<WhatsAppLogo className="w-5 h-5 text-[#128C3F]" />}
      title="WhatsApp"
      businessName={lead.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={send.isPending} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => send.mutate()} disabled={send.isPending} className="btn-primary">
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
            {send.isPending ? 'Sending…' : 'Send message'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#374151] mb-2">Template</legend>
          <div className="flex items-center gap-2 bg-[#F4F5F8] p-1 rounded-xl border border-[#E2E8F0]">
            {(
              [
                ['website_automation_pitch_v2', 'Website pitch'],
                ['first_outreach', 'Standard outreach'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTemplate(value)}
                aria-pressed={template === value}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${template === value ? 'bg-white text-[#B93A0E] shadow-xs' : 'text-[#374151] hover:text-[#14161A]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#374151] mb-2">Preview</div>
          <div className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-[16px] p-4 text-[13px] space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]/60">
              <span className="font-bold text-[#14161A] text-[12px]">To {normalizePhone(lead.phone)}</span>
              <span className="badge-success text-[10px]">Meta-approved template</span>
            </div>
            <p className="italic text-[#14161A] leading-relaxed break-words">
              {template === 'website_automation_pitch_v2'
                ? `"Hi ${lead.name}, I checked out your website (${lead.website || 'your website'})! We build custom AI automations for businesses like yours…"`
                : `"Hello ${lead.name}, we came across your business listing and wanted to connect…"`}
            </p>
          </div>
        </div>

        {send.isError && !(send.error instanceof PermissionError) && <ErrorNote>{errorMessage(send.error)}</ErrorNote>}
      </div>
    </OutreachModal>
  );
}

function EmailDialog({ lead, businessType, onClose, onSent }: { lead: SearchLead; businessType: string; onClose: () => void; onSent: (r: OutreachResult, email: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  // AI drafting spends the owner's Gemini quota, so it stays with admin accounts.
  const canUseAI = isOutreachAuthorized(user?.email);
  const templates = EMAIL_TEMPLATES.filter((t) => t.render || canUseAI);
  const senderName: string = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const fill = (tplId: EmailTemplateId) =>
    EMAIL_TEMPLATES.find((t) => t.id === tplId)?.render?.({ businessName: lead.name, address: lead.address, website: lead.website, senderName });

  const [toEmail, setToEmail] = useState(lead.email || '');
  const [templateId, setTemplateId] = useState<EmailTemplateId>(
    canUseAI ? 'ai_personalized_email' : lead.has_website ? 'automation_pitch_email' : 'website_pitch_email'
  );
  const [subject, setSubject] = useState(() => fill(templateId)?.subject ?? '');
  const [body, setBody] = useState(() => fill(templateId)?.body ?? '');
  const [touched, setTouched] = useState(false);
  const isAI = templateId === 'ai_personalized_email';
  const emailInvalid = !isValidEmail(toEmail);

  const gmailKey = queryKeys.gmailStatus(user?.id);
  const gmail = useQuery({ queryKey: gmailKey, queryFn: fetchGmailStatus, enabled: !!user });
  const connect = useMutation({
    mutationFn: async () => {
      const err = await startGmailConnect(user!);
      if (err) throw err;
    },
  });

  const draft = useMutation({
    mutationFn: () => generateAIEmail({ businessName: lead.name, businessType, address: lead.address, website: lead.website || undefined }),
    onSuccess: (d) => {
      setSubject(d.subject);
      setBody(d.body);
    },
  });

  const send = useMutation({
    mutationFn: () => sendColdEmail({ lead, toEmail, templateId, subject, body, businessType, user: user! }),
    onSuccess: (r) => onSent(r, toEmail.trim()),
    onError: (err) => {
      if (isGmailNotConnected(err)) queryClient.setQueryData(gmailKey, { connected: false, email: null, error: err.message });
    },
  });

  const connected = !!gmail.data?.connected;
  const ready = connected && !!subject.trim() && !!body.trim();
  const busy = send.isPending || draft.isPending || connect.isPending;

  return (
    <OutreachModal
      isOpen
      onClose={busy ? () => {} : onClose}
      icon={<GmailLogo className="w-5 h-5" />}
      title="Email"
      businessName={lead.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={() => {
              setTouched(true);
              if (!emailInvalid && ready) send.mutate();
            }}
            disabled={busy || !ready}
            className="btn-primary"
          >
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Mail className="w-4 h-4" aria-hidden="true" />}
            {send.isPending ? 'Sending…' : 'Send email'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {gmail.isPending ? (
          <p className="text-[12px] text-[#4B5264] flex items-center gap-2" role="status">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Checking your Gmail connection…
          </p>
        ) : gmail.isError ? (
          <ErrorNote>{errorMessage(gmail.error)}</ErrorNote>
        ) : connected ? (
          <p className="text-[12px] text-[#374151] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            Sending from <span className="font-mono font-bold text-[#14161A]">{gmail.data.email}</span>
          </p>
        ) : (
          <div className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-[16px] p-4 space-y-3">
            <p className="text-[13px] text-[#374151] leading-relaxed">
              Emails are sent from your own Gmail account (<span className="font-mono font-bold text-[#14161A]">{user?.email}</span>).
              Connect it once to allow sending.
            </p>
            {gmail.data?.error && <ErrorNote>{gmail.data.error}</ErrorNote>}
            {connect.isError && <ErrorNote>{errorMessage(connect.error)}</ErrorNote>}
            <button type="button" onClick={() => connect.mutate()} disabled={connect.isPending} className="btn-secondary w-full">
              {connect.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <GmailLogo />}
              Connect Gmail
            </button>
          </div>
        )}

        <div>
          <FieldLabel htmlFor={`${id}-to`}>Recipient email</FieldLabel>
          <input
            id={`${id}-to`}
            type="email"
            data-autofocus={!lead.email || undefined}
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && emailInvalid}
            aria-describedby={touched && emailInvalid ? `${id}-to-err` : undefined}
            placeholder="contact@business.com"
            className="ui-input font-mono text-[13px]"
          />
          {touched && emailInvalid && (
            <p id={`${id}-to-err`} className="text-[12px] text-[#B91C1C] mt-1.5 font-medium">Enter a valid email address.</p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={`${id}-tpl`}>Template</FieldLabel>
          <select
            id={`${id}-tpl`}
            value={templateId}
            onChange={(e) => {
              const next = e.target.value as EmailTemplateId;
              setTemplateId(next);
              draft.reset();
              const filled = fill(next);
              setSubject(filled?.subject ?? '');
              setBody(filled?.body ?? '');
            }}
            className="ui-input text-[13px] cursor-pointer"
          >
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {isAI && (
            <button
              type="button"
              onClick={() => draft.mutate()}
              disabled={draft.isPending}
              className="w-full py-2.5 px-4 rounded-full border border-[#D44314] text-[#B93A0E] hover:bg-[#FDEDE7]/60 font-bold text-[13px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {draft.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {draft.isPending ? 'Drafting…' : body ? 'Redraft with AI' : 'Draft with AI'}
            </button>
          )}
          {draft.isError && <ErrorNote>{errorMessage(draft.error)}</ErrorNote>}
          <div>
            <FieldLabel htmlFor={`${id}-subject`}>Subject</FieldLabel>
            <input id={`${id}-subject`} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="ui-input font-bold text-[13px]" placeholder={isAI ? 'Draft with AI or write your own' : 'Subject'} />
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-body`}>Message</FieldLabel>
            <textarea id={`${id}-body`} value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="ui-input text-[13px] leading-relaxed resize-y" placeholder={isAI ? 'Draft with AI or write your own' : 'Message'} />
          </div>
        </div>

        {send.isError && !isGmailNotConnected(send.error) && <ErrorNote>{errorMessage(send.error)}</ErrorNote>}
      </div>
    </OutreachModal>
  );
}

function LinkedInDialog({ lead, onClose }: { lead: SearchLead; onClose: () => void }) {
  const id = useId();
  const [url, setUrl] = useState(lead.linkedin_url || '');
  const target = url.trim() ? toExternalUrl(url) : '';
  const invalid = !!url.trim() && !/(^|\.)linkedin\.com$/i.test(safeHost(target));
  const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.name)}`;

  return (
    <OutreachModal
      isOpen
      onClose={onClose}
      icon={<LinkedInLogo className="w-5 h-5 text-[#0A66C2]" />}
      title="LinkedIn"
      businessName={lead.name}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <a
            href={target && !invalid ? target : searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => (invalid ? e.preventDefault() : onClose())}
            aria-disabled={invalid}
            className={`btn-primary ${invalid ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {target && !invalid ? 'Open profile' : 'Search LinkedIn'}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      }
    >
      <div>
        <FieldLabel htmlFor={`${id}-url`}>LinkedIn profile URL</FieldLabel>
        <input
          id={`${id}-url`}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          placeholder="linkedin.com/company/business-name"
          className="ui-input font-mono text-[13px]"
        />
        <p id={`${id}-hint`} className={`text-[12px] mt-2 leading-normal ${invalid ? 'text-[#B91C1C] font-medium' : 'text-[#4B5264]'}`}>
          {invalid ? 'That is not a linkedin.com link.' : 'Leave empty to search LinkedIn for this business.'}
        </p>
      </div>
    </OutreachModal>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/* ─────────────────────────── Page ─────────────────────────── */

export function SearchPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { leads: crmLeads } = useLeads();
  const formId = useId();
  const savedSearchKey = `lead-search:${user?.id}`;
  const [savedSearch] = useState(() => readSavedSearch(savedSearchKey));
  const savedType = savedSearch?.query.type;
  const savedIsPreset = !!savedType && (BUSINESS_TYPES as readonly string[]).includes(savedType);
  const [businessType, setBusinessType] = useState<string>(savedType ? (savedIsPreset ? savedType : 'Other') : BUSINESS_TYPES[0]);
  const [businessTypeOther, setBusinessTypeOther] = useState(savedType && !savedIsPreset ? savedType : '');
  const [location, setLocation] = useState(savedSearch?.query.location ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<{ type: string; location: string } | null>(savedSearch?.query ?? null);
  const [filterChip, setFilterChip] = useState<ChipFilter>('all');
  const [active, setActive] = useState<{ lead: SearchLead; channel: Channel } | null>(null);
  const [showPermission, setShowPermission] = useState(false);
  const [contacted, setContacted] = useState<Record<string, { whatsapp?: boolean; email?: boolean }>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const effectiveType = businessType === 'Other' ? businessTypeOther.trim() : businessType;

  const statsQuery = useQuery({
    queryKey: queryKeys.searchStats(user?.id),
    queryFn: () => fetchOutreachStats(user!.id),
    enabled: !!user?.id,
  });
  const countSent = useCountUp(statsQuery.data?.sent_this_month ?? 0);
  const countTotal = useCountUp(statsQuery.data?.total_logged ?? 0);

  const search = useMutation<SearchResult, Error, { type: string; other: string; location: string }>({
    mutationFn: ({ type, other, location: loc }) => searchLeads(type, other, loc),
    onSuccess: (result, vars) =>
      writeSavedSearch(savedSearchKey, { query: { type: vars.type === 'Other' ? vars.other : vars.type, location: vars.location }, result }),
    onMutate: () => {
      setFilterChip('all');
      setNotice(null);
      setContacted({});
    },
  });

  useEffect(() => {
    if (!search.isPending) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [search.isPending]);

  // Existing CRM leads by phone digits / email, to flag duplicates in the results.
  const crmIndex = useMemo(() => {
    const byPhone = new Map<string, Lead>();
    const byEmail = new Map<string, Lead>();
    for (const l of crmLeads) {
      const p = normalizePhone(l.phone);
      if (p) byPhone.set(p, l);
      const e = normalizeEmail(l.email);
      if (e) byEmail.set(e, l);
    }
    return { byPhone, byEmail };
  }, [crmLeads]);

  const findCrmLead = (lead: SearchLead) => {
    const p = normalizePhone(lead.phone);
    const e = normalizeEmail(lead.email);
    return (p && crmIndex.byPhone.get(p)) || (e && crmIndex.byEmail.get(e)) || undefined;
  };

  const save = useMutation({
    mutationFn: (lead: SearchLead) =>
      saveLeadForUser(user!.id, {
        business_name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        website: lead.website,
        rating: lead.rating,
        category: effectiveType || null,
        city: lead.city,
        linkedin_url: lead.linkedin_url,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads(user?.id) }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const loc = location.trim();
    if (businessType === 'Other' && !businessTypeOther.trim()) return setFormError('Enter the custom business category.');
    if (loc.length < 2) return setFormError('Enter a city or location to search.');
    setFormError(null);
    setLastQuery({ type: effectiveType, location: loc });
    search.mutate({ type: businessType, other: businessTypeOther.trim(), location: loc });
  };

  const handleSent = (lead: SearchLead, channel: 'whatsapp' | 'email', result: OutreachResult) => {
    setActive(null);
    setContacted((prev) => ({ ...prev, [leadKey(lead)]: { ...prev[leadKey(lead)], [channel]: true } }));
    queryClient.invalidateQueries({ queryKey: queryKeys.leads(user?.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.searchStats(user?.id) });
    setNotice(
      result.crmError
        ? { tone: 'warning', text: `${channel === 'whatsapp' ? 'WhatsApp message' : 'Email'} sent to ${lead.name}, but the CRM was not updated: ${result.crmError}` }
        : { tone: 'success', text: `${channel === 'whatsapp' ? 'WhatsApp message' : 'Email'} sent to ${lead.name}. Lead marked as contacted in your CRM.` }
    );
  };

  const openOutreach = (lead: SearchLead, channel: Channel) => {
    if (channel === 'whatsapp' && !isOutreachAuthorized(user?.email)) return setShowPermission(true);
    if (channel === 'linkedin' && lead.linkedin_url) {
      const url = toExternalUrl(lead.linkedin_url);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    setActive({ lead, channel });
  };

  // Hide businesses this user already contacted (from their own CRM). Leads sent to in this
  // session stay visible so the "sent" check remains on screen.
  const wasContacted = (lead: SearchLead) => {
    const crm = findCrmLead(lead);
    return !!crm && (crm.status !== 'NEW' || !!crm.last_contact_at) && !contacted[leadKey(lead)];
  };
  const searchData = search.data ?? (search.isIdle ? savedSearch?.result : undefined);
  const allResults = searchData?.leads ?? null;
  const results = allResults?.filter((l) => !wasContacted(l)) ?? null;
  const alreadyContacted = (allResults?.length ?? 0) - (results?.length ?? 0);
  const noWebsite = results?.filter((l) => !l.has_website).length ?? 0;
  const withWebsite = (results?.length ?? 0) - noWebsite;
  const displayLeads = (results ?? []).filter((l) => (filterChip === 'no_website' ? !l.has_website : filterChip === 'has_website' ? l.has_website : true));

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 font-sans text-[#14161A]">
      <div className="bg-[#E8EAF0] rounded-[24px] p-4 sm:p-6 lg:p-8 border border-[#D1D5DB] shadow-xs space-y-6 animate-blur-fade-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D1D5DB] pb-5">
          <div>
            <div className="eyebrow text-[#374151] mb-1">Google Places discovery</div>
            <h1 className="text-display-lg text-[#14161A] tracking-tight">Search &amp; contact leads</h1>
          </div>
          {statsQuery.data && (
            <dl className="flex items-center gap-3">
              <div className="bg-white rounded-[16px] px-5 py-3 text-center border border-[#E2E8F0] shadow-xs min-w-[120px] flex flex-col-reverse">
                <dt className="eyebrow mt-0.5 text-[#374151] text-[10px]">Sent this month</dt>
                <dd className="text-display text-[28px] text-[#14161A]">{countSent}</dd>
              </div>
              <div className="bg-white rounded-[16px] px-5 py-3 text-center border border-[#E2E8F0] shadow-xs min-w-[120px] flex flex-col-reverse">
                <dt className="eyebrow mt-0.5 text-[#374151] text-[10px]">Total logged</dt>
                <dd className="text-display text-[28px] text-[#14161A]">{countTotal}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <form onSubmit={handleSearch} noValidate aria-labelledby={`${formId}-title`} className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-6 space-y-5 ui-card">
            <h2 id={`${formId}-title`} className="eyebrow text-[#B93A0E] flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Filter className="w-4 h-4" aria-hidden="true" />
              Discovery filters
            </h2>

            <div>
              <label htmlFor={`${formId}-type`} className="eyebrow text-[#374151] block mb-2">Business category</label>
              <select id={`${formId}-type`} value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="quiet-input font-bold cursor-pointer">
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {businessType === 'Other' && (
              <div className="animate-fade-in">
                <label htmlFor={`${formId}-other`} className="eyebrow text-[#374151] block mb-2">Custom category</label>
                <input id={`${formId}-other`} value={businessTypeOther} onChange={(e) => setBusinessTypeOther(e.target.value)} className="quiet-input" placeholder="e.g. pet groomer" required />
              </div>
            )}

            <div>
              <label htmlFor={`${formId}-loc`} className="eyebrow text-[#374151] block mb-2">City / location</label>
              <input
                id={`${formId}-loc`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="quiet-input"
                placeholder="e.g. Guwahati, Assam"
                autoComplete="address-level2"
                required
                aria-invalid={!!formError}
                aria-describedby={formError ? `${formId}-err` : undefined}
              />
            </div>

            {formError && <p id={`${formId}-err`} role="alert" className="text-[12px] text-[#B91C1C] font-medium -mt-2">{formError}</p>}

            <button type="submit" disabled={search.isPending} className="btn-primary w-full !py-3.5">
              {search.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
              {search.isPending ? 'Searching…' : 'Discover leads'}
            </button>
          </form>

          <section className="flex-1 min-w-0 w-full space-y-6" aria-label="Search results" aria-busy={search.isPending}>
            {notice && (
              <div
                role="status"
                className={`rounded-[20px] p-4 text-[13px] flex items-start gap-3 font-medium border ${
                  notice.tone === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {notice.tone === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
                <span className="flex-1">{notice.text}</span>
                <button type="button" onClick={() => setNotice(null)} className="btn-icon !w-7 !h-7" aria-label="Dismiss message">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {search.isPending ? (
              <div role="status" className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center space-y-3 shadow-xs">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#D44314]" aria-hidden="true" />
                <p className="text-[15px] font-bold text-[#14161A]">
                  Searching {lastQuery?.type} in {lastQuery?.location}…
                </p>
                <p className="text-[13px] text-[#4B5264]">
                  Google Places lookups and website scans usually take 20–60 seconds. <span className="font-mono">{elapsed}s</span>
                </p>
              </div>
            ) : search.isError ? (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-[20px] p-5 text-[13px] space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-bold">Search failed</p>
                    <p className="mt-0.5">{search.error.message}</p>
                  </div>
                </div>
                <button type="button" onClick={() => search.mutate(search.variables!)} className="btn-secondary !py-1.5">Retry search</button>
              </div>
            ) : results ? (
              <div className="space-y-5">
                <div className="bg-white rounded-[20px] p-4 border border-[#d1d5db] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#14161A]" aria-live="polite">
                      {results.length} {results.length === 1 ? 'lead' : 'leads'} found
                    </h2>
                    {(searchData!.duplicates > 0 || searchData!.invalid > 0 || alreadyContacted > 0) && (
                      <p className="text-[12px] text-[#4B5264]">
                        {alreadyContacted > 0 && `${alreadyContacted} already contacted from your CRM hidden. `}
                        {searchData!.duplicates > 0 && `${searchData!.duplicates} duplicate${searchData!.duplicates > 1 ? 's' : ''} removed. `}
                        {searchData!.invalid > 0 && `${searchData!.invalid} incomplete result${searchData!.invalid > 1 ? 's' : ''} skipped.`}
                      </p>
                    )}
                    {searchData!.cachedAt && (
                      <p className="text-[12px] text-[#4B5264]">
                        Cached Google Places results, fetched {timeAgo(searchData!.cachedAt).toLowerCase()}.
                      </p>
                    )}
                  </div>
                  {results.length > 0 && (
                    <div role="group" aria-label="Filter results" className="flex items-center gap-1.5 bg-[#f1f5f9] p-1 rounded-xl border border-[#cbd5e1] self-start sm:self-auto flex-wrap">
                      {(
                        [
                          ['all', `All (${results.length})`],
                          ['no_website', `No website (${noWebsite})`],
                          ['has_website', `Has website (${withWebsite})`],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFilterChip(value)}
                          aria-pressed={filterChip === value}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${filterChip === value ? 'bg-white text-[#14161A] shadow-xs' : 'text-[#374151] hover:text-[#14161A]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {results.length === 0 ? (
                  <div className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center space-y-2">
                    <p className="text-[15px] font-bold text-[#14161A]">No new leads for “{lastQuery?.type}” in {lastQuery?.location}</p>
                    <p className="text-[13px] text-[#4B5264] max-w-md mx-auto">
                      Businesses without a phone number, and ones you already contacted, are not shown. Try a nearby city, a broader category, or check the spelling of the location.
                    </p>
                  </div>
                ) : displayLeads.length === 0 ? (
                  <div className="bg-white border border-[#d1d5db] rounded-[24px] p-10 text-center text-[#374151] font-bold text-[14px]">No leads match this filter.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
                    {displayLeads.map((lead) => {
                      const key = leadKey(lead);
                      const savingThis = save.isPending && save.variables === lead;
                      const saveErrorThis = save.isError && save.variables === lead ? errorMessage(save.error) : null;
                      return (
                        <SearchResultCard
                          key={key}
                          lead={lead}
                          crmLead={findCrmLead(lead)}
                          contacted={contacted[key] ?? {}}
                          saving={savingThis}
                          saveError={saveErrorThis}
                          onSave={() => save.mutate(lead)}
                          onOutreach={(channel) => openOutreach(lead, channel)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#d1d5db] rounded-[24px] p-12 text-center space-y-3 shadow-xs">
                <Search className="w-10 h-10 mx-auto text-[#6B7280]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[#14161A]">Ready to discover local leads</h2>
                <p className="text-[13px] text-[#4B5264] max-w-md mx-auto">
                  Choose a business category and a city, then run a search to pull businesses from Google Places.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {active?.channel === 'whatsapp' && (
        <WhatsAppDialog
          lead={active.lead}
          businessType={effectiveType}
          onClose={() => setActive(null)}
          onSent={(r) => handleSent(active.lead, 'whatsapp', r)}
          onPermission={() => {
            setActive(null);
            setShowPermission(true);
          }}
        />
      )}
      {active?.channel === 'email' && (
        <EmailDialog lead={active.lead} businessType={effectiveType} onClose={() => setActive(null)} onSent={(r) => handleSent(active.lead, 'email', r)} />
      )}
      {active?.channel === 'linkedin' && <LinkedInDialog lead={active.lead} onClose={() => setActive(null)} />}

      <OutreachPermissionModal open={showPermission} onClose={() => setShowPermission(false)} />
    </div>
  );
}
