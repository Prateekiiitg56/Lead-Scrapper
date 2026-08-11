import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Bot,
  Phone,
  ArrowLeft,
  MessageSquare,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useInbox, useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { isOutreachAuthorized } from '@/services/permissionService';
import { OutreachPermissionModal } from '@/components/common/OutreachPermissionModal';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { timeAgo, truncate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { sendCustomWhatsAppText } from '@/services/searchService';
import type { LeadStatus } from '@/lib/constants';

function MessageBubble({
  direction,
  message,
  timestamp,
  status,
  messageType,
  aiClassification,
}: {
  direction: 'INBOUND' | 'OUTBOUND';
  message: string | null;
  timestamp: string;
  status: string;
  messageType: string;
  aiClassification?: {
    intent?: string;
    sentiment?: string;
    priority?: string;
    summary?: string;
    next_action?: string;
  } | null;
}) {
  const isInbound = direction === 'INBOUND';

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-4 animate-fade-in`}>
      <div className="max-w-[78%]">
        <div
          className={`rounded-[18px] px-4 py-3 text-[13px] leading-relaxed select-text shadow-xs ${
            isInbound
              ? 'bg-[#f0f2f5] border border-[#cbd5e1] text-[#14161A] rounded-bl-xs'
              : 'bg-[#F0501E] text-white font-medium rounded-br-xs shadow-sm shadow-[#F0501E]/20'
          }`}
        >
          {messageType === 'template' ? (
            <div className="italic text-white/70 text-[12px]">
              Template message sent
            </div>
          ) : (
            message || <span className="text-[#6B7280] italic">No content</span>
          )}
        </div>

        <div className={`flex items-center gap-2 mt-1.5 ${isInbound ? '' : 'justify-end'}`}>
          <span className="text-[10px] text-[#6B7280] font-mono">{timeAgo(timestamp)}</span>
          {!isInbound && (
            <span className={`text-[10px] font-mono ${
              status === 'read'      ? 'text-emerald-600 font-semibold' :
              status === 'delivered' ? 'text-[#6B7280]' :
              status === 'failed'    ? 'text-red-600 font-semibold' :
              'text-[#6B7280]'
            }`}>
              {status === 'read' || status === 'delivered' ? 'Read' :
               status === 'sent'   ? 'Sent' :
               status === 'failed' ? 'Failed' : 'Pending'}
            </span>
          )}
        </div>

        {/* AI classification card */}
        {isInbound && aiClassification && (
          <div className="mt-2.5 bg-[#f0f2f5] border border-[#cbd5e1] text-[#14161A] rounded-xl p-3.5 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-[#F0501E] mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="eyebrow text-[#6B7280]">AI Analysis</div>
                <div className="text-[12px] text-[#14161A] font-medium leading-normal">{aiClassification.summary}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {aiClassification.intent && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#d8dadf] border border-[#cbd5e1] text-[#14161A] font-mono font-medium">
                      {aiClassification.intent}
                    </span>
                  )}
                  {aiClassification.sentiment && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#d8dadf] border border-[#cbd5e1] text-[#6B7280] font-mono">
                      {aiClassification.sentiment}
                    </span>
                  )}
                  {aiClassification.priority && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#d8dadf] border border-[#cbd5e1] text-[#6B7280] font-mono">
                      {aiClassification.priority}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function InboxPage() {
  const { user } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unreplied' | 'replied'>('all');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const { conversations, loading: inboxLoading, refetch: refetchInbox } = useInbox();
  const { messages, loading: messagesLoading, refetch: refetchMessages } = useConversations(selectedLeadId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedLeadId && conversations.length > 0) {
      setSelectedLeadId(conversations[0].lead_id);
    }
  }, [conversations, selectedLeadId]);

  const selectedConversation = conversations.find(c => c.lead_id === selectedLeadId);

  const checkIsReplied = (c: any) => {
    const lead = c?.leads;
    const leadStatus = (lead?.status || '').toUpperCase();
    const hasInbound = c.direction === 'INBOUND';
    const hasLastReply = !!lead?.last_reply_at;
    const isRepliedStatus = ['REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'CLIENT'].includes(leadStatus);
    return hasInbound || hasLastReply || isRepliedStatus;
  };

  const repliedCount = conversations.filter(checkIsReplied).length;
  const unrepliedCount = conversations.length - repliedCount;

  const filteredConversations = conversations.filter(c => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead  = (c as any).leads;
    const name  = lead?.business_name || '';
    const phone = lead?.phone || '';
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
    if (!matchesSearch) return false;

    const isReplied = checkIsReplied(c);
    if (filterTab === 'replied') return isReplied;
    if (filterTab === 'unreplied') return !isReplied;
    return true;
  });

  const handleSelectConversation = (leadId: string) => {
    setSelectedLeadId(leadId);
    setMobileShowChat(true);
  };

  const handleSendText = async () => {
    if (!inputText.trim() || !selectedLeadId || sending) return;

    if (!isOutreachAuthorized(user?.email)) {
      setShowPermissionModal(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = (selectedConversation as any)?.leads;
    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      if (lead?.phone) {
        const sentOk = await sendCustomWhatsAppText(lead.phone, textToSend, user?.email);
        if (!sentOk) {
          setShowPermissionModal(true);
          return;
        }
      }
      await supabase.from('conversations').insert({
        lead_id: selectedLeadId,
        direction: 'OUTBOUND',
        message: textToSend,
        message_type: 'text',
        status: 'sent',
        timestamp: new Date().toISOString(),
      });
      refetchMessages();
      refetchInbox();
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAiSuggestion = (suggestion: string) => setInputText(suggestion);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto select-none font-sans text-[#14161A] bg-transparent">
      {/* ── Inbox Outer Glass Shell ── */}
      <div className="relative z-10 flex h-[calc(100vh-140px)] w-full bg-[#e8eaf0]/95 backdrop-blur-md border border-[#cbd5e1] rounded-[24px] overflow-hidden shadow-xl">
        {/* ── Conversation List Sidebar ── */}
        <div className={`w-full lg:w-80 border-r border-[#cbd5e1] flex flex-col bg-[#e8eaf0] ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header */}
          <div className="px-5 py-5 border-b border-[#E2E8F0] bg-[#E8EAF0]">
            <h1 className="text-display text-[28px] text-[#14161A] mb-4 animate-blur-fade-up">
              Inbox
            </h1>
            <div className="relative animate-blur-fade-up" style={{ animationDelay: '100ms' }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A90A2] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="quiet-input !pl-11 text-[13px]"
                placeholder="Search conversations..."
              />
            </div>

            {/* Filter Tabs: All / Replied / Unreplied */}
            <div className="flex items-center gap-1 mt-3 bg-[#d8dadf]/70 p-1 rounded-xl animate-blur-fade-up" style={{ animationDelay: '150ms' }}>
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white text-[#14161A] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('replied')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  filterTab === 'replied'
                    ? 'bg-white text-[#F0501E] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Replied ({repliedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unreplied')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  filterTab === 'unreplied'
                    ? 'bg-white text-[#14161A] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Unreplied ({unrepliedCount})
              </button>
            </div>
          </div>

          {/* Conversation rows */}
          <div className="flex-1 overflow-y-auto">
            {inboxLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 border-b border-[#cbd5e1]">
                    <div className="flex items-center gap-3">
                      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-28" />
                        <div className="skeleton h-3 w-40" />
                      </div>
                    </div>
                  </div>
                ))
              : filteredConversations.length === 0
              ? (
                <div className="text-center py-16 text-[#6B7280] text-[13px] px-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[#6B7280] animate-float" />
                  {filterTab === 'replied'
                    ? 'No replied conversations'
                    : filterTab === 'unreplied'
                    ? 'No unreplied conversations'
                    : search
                    ? 'No matching conversations found'
                    : 'No conversations yet'}
                </div>
              )
              : filteredConversations.map((conv) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const lead = (conv as any).leads;
                  const isSelected  = conv.lead_id === selectedLeadId;
                  const isInbound   = conv.direction === 'INBOUND';
                  const isUnread    = isInbound && conv.status !== 'read';
                  const initial     = (lead?.business_name?.charAt(0) || '?').toUpperCase();

                  return (
                    <button
                      key={conv.lead_id}
                      onClick={() => handleSelectConversation(conv.lead_id)}
                      className={`relative w-full text-left px-5 py-4 border-b border-[#cbd5e1] transition-all duration-150 group cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#14161A] font-bold border-l-4 border-l-[#F0501E] shadow-xs'
                          : 'hover:bg-white/50 text-[#6B7280]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-[#e5e7eb] border border-[#cbd5e1] flex items-center justify-center text-[13px] font-mono text-[#14161A] font-bold flex-shrink-0 transition-colors ${isSelected ? 'border-[#F0501E] text-[#F0501E]' : ''}`}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className={`text-[13px] truncate transition-colors ${isSelected ? 'text-[#14161A] font-bold' : 'text-[#14161A] font-medium group-hover:text-[#F0501E]'}`}>
                              {lead?.business_name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-[#6B7280] ml-2 flex-shrink-0 font-mono">{timeAgo(conv.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isUnread && <span className="w-2 h-2 rounded-full bg-[#F0501E] flex-shrink-0" />}
                            <span className="text-[12px] text-[#6B7280] truncate">
                              {!isInbound && <span className="text-[#6B7280]">You: </span>}
                              {conv.message_type === 'template'
                                ? 'Template message'
                                : truncate(conv.message || '', 45)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
            }
          </div>
        </div>

        {/* ── Chat Thread Main Section (Theme-Blended Surface) ── */}
        <div className={`flex-1 flex flex-col bg-[#e2e4e8]/80 backdrop-blur-md ${!mobileShowChat && !selectedLeadId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedLeadId ? (
            <div key={selectedLeadId} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-6 h-16 border-b border-[#cbd5e1] bg-[#e8eaf0]">
                <button
                  onClick={() => { setMobileShowChat(false); setSelectedLeadId(null); }}
                  className="lg:hidden text-[#6B7280] hover:text-[#14161A] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-[#F0501E] text-white flex items-center justify-center text-[12px] font-mono font-bold shadow-xs">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {((selectedConversation as any)?.leads?.business_name?.charAt(0) || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[#14161A] font-bold truncate">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(selectedConversation as any)?.leads?.business_name || 'Unknown'}
                  </div>
                  <div className="text-[11px] text-[#6B7280] font-mono">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(selectedConversation as any)?.leads?.phone || ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(selectedConversation as any)?.leads?.status && (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <LeadStatusBadge status={(selectedConversation as any).leads.status as LeadStatus} />
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(selectedConversation as any)?.leads?.phone && (
                    <a
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      href={`tel:${(selectedConversation as any).leads.phone}`}
                      className="p-2 text-[#6B7280] hover:text-[#F0501E] transition-colors rounded-full hover:bg-white/60 cursor-pointer"
                      title="Call Business"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Messages area capped to max-w-4xl */}
              <div className="flex-1 overflow-y-auto px-6 py-6 bg-transparent w-full">
                <div className="max-w-4xl mx-auto space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-[13px] text-[#6B7280]">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <MessageSquare className="w-9 h-9 mx-auto mb-3 text-[#6B7280] animate-float" />
                        <p className="text-[13px] text-[#6B7280]">No messages yet</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        direction={msg.direction}
                        message={msg.message}
                        timestamp={msg.timestamp}
                        status={msg.status}
                        messageType={msg.message_type}
                        aiClassification={msg.ai_classification}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Quick actions + input footer */}
              <div className="px-6 py-4 border-t border-[#cbd5e1] bg-[#e8eaf0]">
                <div className="max-w-4xl mx-auto space-y-3">
                  {/* AI quick chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <Sparkles className="w-3.5 h-3.5 text-[#F0501E] flex-shrink-0 animate-pulse" />
                    {[
                      { label: 'Send Pricing',    text: 'Here is our pricing structure: Basic ($99/mo), Pro ($299/mo). Let me know if you would like a quick demo!' },
                      { label: 'Schedule Call',   text: 'Would you be available for a 10-minute call tomorrow at 2 PM to discuss this further?' },
                      { label: 'Follow Up',       text: 'Hi! Just following up to see if you had any questions regarding our previous message.' },
                      { label: 'Ask Requirements', text: 'Thank you for reaching out! What specific features are you looking for?' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleAiSuggestion(chip.text)}
                        className="bg-[#e5e7eb] hover:bg-[#d8dadf] border border-[#cbd5e1] px-3.5 py-1.5 rounded-full text-[11px] font-medium text-[#14161A] transition-colors whitespace-nowrap flex-shrink-0 shadow-xs cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Text input */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendText(); }}
                    className="flex items-center gap-2 relative"
                  >
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                      className="quiet-input !pl-5 flex-1 bg-[#f8f9fc] border-[#cbd5e1] text-[#14161A] placeholder:text-[#6B7280]"
                      placeholder="Type a message..."
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="bg-[#F0501E] hover:bg-[#F0501E]/90 text-white p-3 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-md shadow-[#F0501E]/20 cursor-pointer"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state (No Conversation Selected) */
            <div className="flex-1 flex items-center justify-center p-6 bg-[#e2e4e8]/60">
              <div className="max-w-md mx-auto p-8 rounded-[24px] bg-white border border-[#d1d5db] shadow-xs text-center space-y-3 animate-blur-fade-up">
                <div className="w-14 h-14 rounded-2xl bg-[#f0f2f5] border border-[#d1d5db] flex items-center justify-center mx-auto mb-2 text-[#F0501E] shadow-xs">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#14161A] font-sans">Select a Lead Conversation</h3>
                <p className="text-[13px] text-[#64748b] leading-relaxed font-sans">
                  Choose any prospect from the left sidebar to view live WhatsApp messages, AI intent classifications, and reply instantly.
                </p>
              </div>
            </div>
          )}
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
