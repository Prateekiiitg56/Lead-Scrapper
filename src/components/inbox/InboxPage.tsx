import { useState, useRef, useEffect, useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Send, Bot, Phone, ArrowLeft, MessageSquare, Loader2, Sparkles, AlertCircle, Mail } from 'lucide-react';
import { useInbox, useThread } from '@/hooks/useConversations';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { isOutreachAuthorized } from '@/services/permissionService';
import { sendInboxReply } from '@/services/searchService';
import { OutreachPermissionModal } from '@/components/common/OutreachPermissionModal';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { queryKeys } from '@/lib/queryClient';
import { errorMessage, timeAgo, truncate } from '@/lib/utils';
import type { Conversation } from '@/types/database';
import type { InboxConversation } from '@/services/conversationService';

const REPLIED_STATUSES = ['REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'CLIENT'];

const QUICK_REPLIES = [
  { label: 'Send pricing', text: 'Here is our pricing structure: Basic ($99/mo), Pro ($299/mo). Let me know if you would like a quick demo!' },
  { label: 'Schedule call', text: 'Would you be available for a 10-minute call tomorrow at 2 PM to discuss this further?' },
  { label: 'Follow up', text: 'Hi! Just following up to see if you had any questions regarding our previous message.' },
  { label: 'Ask requirements', text: 'Thank you for reaching out! What specific features are you looking for?' },
];

function isReplied(c: InboxConversation): boolean {
  return c.direction === 'INBOUND' || !!c.leads?.last_reply_at || REPLIED_STATUSES.includes(c.leads?.status ?? '');
}

function previewText(c: Conversation): string {
  if (c.message_type === 'template') return 'Template message';
  if (c.message_type === 'email') return `Email: ${truncate(c.message || '', 40)}`;
  return truncate(c.message || '', 45);
}

const STATUS_TEXT: Record<string, string> = { read: 'Read', delivered: 'Delivered', sent: 'Sent', failed: 'Failed', pending: 'Pending' };

function MessageBubble({ msg }: { msg: Conversation }) {
  const isInbound = msg.direction === 'INBOUND';
  const ai = msg.ai_classification;

  return (
    <li className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[85%] sm:max-w-[78%]">
        <div
          className={`rounded-[18px] px-4 py-3 text-[13px] leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
            isInbound ? 'bg-white border border-[#cbd5e1] text-[#14161A] rounded-bl-xs' : 'bg-[#D44314] text-white font-medium rounded-br-xs'
          }`}
        >
          <span className="sr-only">{isInbound ? 'They wrote: ' : 'You sent: '}</span>
          {msg.message_type === 'email' && (
            <span className="flex items-center gap-1 text-[11px] font-bold opacity-90 mb-1">
              <Mail className="w-3 h-3" aria-hidden="true" /> Email
            </span>
          )}
          {msg.message_type === 'template' ? (
            <span className="italic">{msg.template_name ? `Template sent: ${msg.template_name}` : 'Template message sent'}</span>
          ) : (
            msg.message || <span className="italic opacity-80">No text content</span>
          )}
        </div>

        <div className={`flex items-center gap-2 mt-1.5 ${isInbound ? '' : 'justify-end'}`}>
          <time dateTime={msg.timestamp} className="text-[11px] text-[#4B5264] font-mono">{timeAgo(msg.timestamp)}</time>
          {!isInbound && (
            <span className={`text-[11px] font-mono ${msg.status === 'failed' ? 'text-red-700 font-semibold' : msg.status === 'read' ? 'text-emerald-700 font-semibold' : 'text-[#4B5264]'}`}>
              {STATUS_TEXT[msg.status] ?? msg.status}
            </span>
          )}
        </div>

        {isInbound && ai && (ai.summary || ai.intent) && (
          <div className="mt-2.5 bg-white/80 border border-[#cbd5e1] text-[#14161A] rounded-xl p-3.5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-[#B93A0E] mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <div className="eyebrow text-[#4B5264]">AI analysis</div>
                {ai.summary && <div className="text-[12px] font-medium leading-normal">{ai.summary}</div>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[ai.intent, ai.sentiment, ai.priority].filter(Boolean).map((tag) => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#EEF0F4] border border-[#cbd5e1] text-[#374151] font-mono">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function InboxPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const composerId = useId();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unreplied' | 'replied'>('all');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [sendWarning, setSendWarning] = useState<string | null>(null);

  const { conversations, loading: inboxLoading, error: inboxError, refetch: refetchInbox } = useInbox();
  const { messages, loading: messagesLoading, error: threadError } = useThread(selectedLeadId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the thread scrolled to the newest message without moving the page itself.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedLeadId]);

  // Desktop: open the most recent conversation by default.
  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0) setSelectedLeadId(conversations[0].lead_id);
  }, [conversations, selectedLeadId]);

  const { leads } = useLeads();
  const selected = conversations.find((c) => c.lead_id === selectedLeadId);
  const selectedLead = selected?.leads;
  // Email lives on the full lead row (and only exists once migration 002 is applied).
  const selectedEmail = leads.find((l) => l.id === selectedLeadId)?.email ?? null;

  const repliedCount = conversations.filter(isReplied).length;
  const q = search.trim().toLowerCase();
  const filtered = conversations.filter((c) => {
    const name = c.leads?.business_name?.toLowerCase() ?? '';
    const phone = c.leads?.phone ?? '';
    if (q && !name.includes(q) && !phone.includes(q)) return false;
    if (filterTab === 'replied') return isReplied(c);
    if (filterTab === 'unreplied') return !isReplied(c);
    return true;
  });

  const send = useMutation({
    mutationFn: ({ leadId, text }: { leadId: string; text: string }) => sendInboxReply(leadId, text),
    onSuccess: (result, { leadId }) => {
      setInputText('');
      setSendWarning(result.warning);
      queryClient.invalidateQueries({ queryKey: queryKeys.thread(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox(user?.id) });
    },
  });

  const canReply = !!selectedLead?.phone;

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !selectedLeadId || send.isPending || !canReply) return;
    if (!isOutreachAuthorized(user?.email)) return setShowPermissionModal(true);
    send.mutate({ leadId: selectedLeadId, text });
  };

  const selectConversation = (leadId: string) => {
    send.reset();
    setSendWarning(null);
    setSelectedLeadId(leadId);
    setMobileShowChat(true);
  };

  const tabs = [
    ['all', `All (${conversations.length})`],
    ['replied', `Replied (${repliedCount})`],
    ['unreplied', `Unreplied (${conversations.length - repliedCount})`],
  ] as const;

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto font-sans text-[#14161A]">
      <div className="relative flex h-[calc(100dvh-170px)] md:h-[calc(100dvh-150px)] min-h-[480px] w-full bg-[#e8eaf0]/95 border border-[#cbd5e1] rounded-[24px] overflow-hidden shadow-xl">
        {/* Conversation list */}
        <section aria-label="Conversations" className={`w-full lg:w-80 border-r border-[#cbd5e1] flex-col bg-[#e8eaf0] ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="px-4 sm:px-5 py-5 border-b border-[#E2E8F0]">
            <h1 className="text-display text-[28px] text-[#14161A] mb-4">Inbox</h1>
            <div className="relative">
              <label htmlFor="inbox-search" className="sr-only">Search conversations</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5264] pointer-events-none" aria-hidden="true" />
              <input id="inbox-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="quiet-input !pl-11 text-[13px]" placeholder="Search conversations..." />
            </div>
            <div role="group" aria-label="Filter conversations" className="flex items-center gap-1 mt-3 bg-[#d8dadf]/70 p-1 rounded-xl">
              {tabs.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilterTab(value)}
                  aria-pressed={filterTab === value}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${filterTab === value ? 'bg-white text-[#14161A] shadow-xs' : 'text-[#374151] hover:text-[#0f172a]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {inboxLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 border-b border-[#cbd5e1] flex items-center gap-3" aria-hidden="true">
                  <div className="skeleton w-10 h-10 !rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-28" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                </div>
              ))
            ) : inboxError ? (
              <div role="alert" className="text-center py-12 px-4 space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-red-600" aria-hidden="true" />
                <p className="text-[13px] text-[#14161A] font-bold">Could not load conversations</p>
                <button type="button" onClick={() => refetchInbox()} className="btn-secondary !py-1.5">Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-[#4B5264] text-[13px] px-4">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 animate-float" aria-hidden="true" />
                {search ? 'No matching conversations' : filterTab === 'replied' ? 'No replied conversations' : filterTab === 'unreplied' ? 'No unreplied conversations' : 'No conversations yet. Contact a lead from Search to start one.'}
              </div>
            ) : (
              <ul>
                {filtered.map((conv) => {
                  const lead = conv.leads;
                  const isSelected = conv.lead_id === selectedLeadId;
                  const isUnread = conv.direction === 'INBOUND' && conv.status !== 'read';
                  return (
                    <li key={conv.lead_id}>
                      <button
                        type="button"
                        onClick={() => selectConversation(conv.lead_id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`relative w-full text-left px-4 sm:px-5 py-4 border-b border-[#cbd5e1] transition-colors cursor-pointer border-l-4 ${
                          isSelected ? 'bg-white border-l-[#D44314]' : 'border-l-transparent hover:bg-white/50'
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <span className={`w-10 h-10 rounded-full bg-[#e5e7eb] border flex items-center justify-center text-[13px] font-mono font-bold flex-shrink-0 ${isSelected ? 'border-[#D44314] text-[#B93A0E]' : 'border-[#cbd5e1] text-[#14161A]'}`} aria-hidden="true">
                            {(lead?.business_name?.charAt(0) || '?').toUpperCase()}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline justify-between mb-1 gap-2">
                              <span className={`text-[13px] truncate text-[#14161A] ${isSelected || isUnread ? 'font-bold' : 'font-medium'}`}>{lead?.business_name || 'Unknown'}</span>
                              <span className="text-[11px] text-[#4B5264] flex-shrink-0 font-mono">{timeAgo(conv.timestamp)}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              {isUnread && (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-[#D44314] flex-shrink-0" aria-hidden="true" />
                                  <span className="sr-only">Unread. </span>
                                </>
                              )}
                              <span className="text-[12px] text-[#4B5264] truncate">
                                {conv.direction === 'OUTBOUND' && 'You: '}
                                {previewText(conv)}
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Thread */}
        <section aria-label="Conversation" className={`flex-1 flex-col bg-[#e8eaf0] min-w-0 ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
          {selectedLeadId && selectedLead ? (
            <div key={selectedLeadId} className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 px-4 sm:px-6 h-16 border-b border-[#cbd5e1] bg-[#e8eaf0] flex-shrink-0">
                <button type="button" onClick={() => setMobileShowChat(false)} className="lg:hidden btn-icon" aria-label="Back to conversations">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="w-9 h-9 rounded-full bg-[#D44314] text-white flex items-center justify-center text-[12px] font-mono font-bold shadow-xs flex-shrink-0" aria-hidden="true">
                  {(selectedLead.business_name?.charAt(0) || '?').toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[14px] text-[#14161A] font-bold truncate">{selectedLead.business_name}</h2>
                  <div className="text-[11px] text-[#4B5264] font-mono truncate">{selectedLead.phone || selectedEmail || ''}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="hidden sm:inline-flex"><LeadStatusBadge status={selectedLead.status} /></span>
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="btn-icon hover:!text-[#B93A0E]" aria-label={`Call ${selectedLead.business_name}`}>
                      <Phone className="w-4 h-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-6" aria-busy={messagesLoading}>
                <div className="max-w-4xl mx-auto">
                  {messagesLoading ? (
                    <p className="text-center text-[13px] text-[#4B5264] py-16">Loading messages…</p>
                  ) : threadError ? (
                    <p role="alert" className="text-center text-[13px] text-red-700 py-16 font-medium">Could not load this conversation.</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-[13px] text-[#4B5264] py-16">No messages yet</p>
                  ) : (
                    <ol className="space-y-4">{messages.map((m) => <MessageBubble key={m.id} msg={m} />)}</ol>
                  )}
                </div>
              </div>

              <div className="px-3 sm:px-6 py-4 border-t border-[#cbd5e1] bg-[#e8eaf0] flex-shrink-0">
                <div className="max-w-4xl mx-auto space-y-3">
                  {!canReply ? (
                    <p className="text-[12px] text-[#374151] font-medium bg-white/70 rounded-xl px-3 py-2 border border-[#cbd5e1]">
                      This lead has no phone number, so WhatsApp replies are unavailable.
                      {selectedEmail && <> Reply by email to <a className="underline font-bold" href={`mailto:${selectedEmail}`}>{selectedEmail}</a>.</>}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Quick replies">
                        <Sparkles className="w-3.5 h-3.5 text-[#B93A0E] flex-shrink-0" aria-hidden="true" />
                        {QUICK_REPLIES.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setInputText(chip.text)}
                            className="bg-white/70 hover:bg-white border border-[#cbd5e1] px-3.5 py-1.5 rounded-full text-[12px] font-medium text-[#14161A] whitespace-nowrap flex-shrink-0 cursor-pointer"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      {sendWarning && (
                        <p role="status" className="text-[12px] text-amber-900 font-medium flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          {sendWarning}
                        </p>
                      )}
                      {send.isError && (
                        <p role="alert" className="text-[12px] text-[#B91C1C] font-medium flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          Not sent: {errorMessage(send.error, 'WhatsApp reply failed.')} Your message is still in the box.
                        </p>
                      )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSend();
                        }}
                        className="flex items-center gap-2"
                      >
                        <label htmlFor={composerId} className="sr-only">Reply on WhatsApp</label>
                        <input
                          id={composerId}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          maxLength={4096}
                          className="quiet-input !pl-5 flex-1"
                          placeholder="Type a WhatsApp reply..."
                          disabled={send.isPending}
                        />
                        <button
                          type="submit"
                          disabled={!inputText.trim() || send.isPending}
                          className="bg-[#D44314] hover:bg-[#B93A0E] text-white w-11 h-11 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-md cursor-pointer"
                          aria-label="Send reply"
                        >
                          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md mx-auto p-8 rounded-[24px] bg-white border border-[#d1d5db] shadow-xs text-center space-y-3">
                <MessageSquare className="w-8 h-8 mx-auto text-[#B93A0E]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[#14161A]">Select a conversation</h2>
                <p className="text-[13px] text-[#4B5264] leading-relaxed">Choose a lead on the left to view messages and AI classifications, and reply on WhatsApp.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <OutreachPermissionModal open={showPermissionModal} onClose={() => setShowPermissionModal(false)} />
    </div>
  );
}
