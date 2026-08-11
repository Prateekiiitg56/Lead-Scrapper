import { useLeadStats, useLeads } from '@/hooks/useLeads';
import { useCountUp } from '@/hooks/useCountUp';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Layers,
  Bot,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';
import { timeAgo } from '@/lib/utils';

function StatTickMarks({ count, colorClass }: { count: number; colorClass: string }) {
  const barsCount = 14;
  const activeBars = Math.min(Math.max(Math.round((count / 50) * barsCount), 2), barsCount);

  return (
    <div className="flex items-center gap-1 pt-3">
      {Array.from({ length: barsCount }).map((_, i) => (
        <div
          key={i}
          className={`h-6 w-0.5 rounded-full transition-all duration-300 ${
            i < activeBars ? colorClass : 'bg-[#d1d5db]'
          }`}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { stats, loading } = useLeadStats();
  const { leads: realLeads, loading: leadsLoading } = useLeads();
  const [timeFilter, setTimeFilter] = useState('This Month');

  const s = stats || {
    total: 0,
    new: 0,
    contacted: 0,
    replied: 0,
    interested: 0,
    follow_up: 0,
    meeting_booked: 0,
    client: 0,
  };

  const replyRate = s.contacted > 0 ? Math.round((s.replied / s.contacted) * 100) : (s.replied > 0 ? 100 : 0);
  const convRate  = s.total > 0 ? Math.round(((s.interested + s.meeting_booked + s.client) / s.total) * 100) : 0;

  const animatedConvRate = useCountUp(convRate);

  const maxVal = Math.max(s.new, s.contacted, s.replied, s.interested, s.follow_up, s.meeting_booked, s.client, 1);

  const stageStems = [
    { label: 'New',        value: `${s.new}`,         numVal: s.new },
    { label: 'Sent',       value: `${s.contacted}`,   numVal: s.contacted },
    { label: 'Replied',    value: `${replyRate}%`,    numVal: s.replied, active: true },
    { label: 'Interested', value: `${s.interested}`,  numVal: s.interested },
    { label: 'Follow Up',  value: `${s.follow_up}`,   numVal: s.follow_up },
    { label: 'Meeting',    value: `${s.meeting_booked}`, numVal: s.meeting_booked },
    { label: 'Client',     value: `${s.client}`,      numVal: s.client },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-7 font-sans text-[#14161A] select-none bg-transparent">
      {/* ── TOP SECTION (2 Columns Side-by-Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* ── LEFT CARD (~60% width, lg:col-span-7): "Lead Outreach Tracker" ── */}
        <div className="lg:col-span-7 ui-card flex flex-col justify-between space-y-6 animate-blur-fade-up">
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#D1D5DB] flex items-center justify-center text-[#14161A]">
                <Layers className="w-5 h-5 text-[#F0501E]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-display text-[26px] text-[#14161A]">
                    Lead Outreach Tracker
                  </h2>
                  <span className="badge-target font-mono">
                    +{animatedConvRate}% Efficiency
                  </span>
                </div>
                <p className="text-[13px] text-[#4B5264] font-medium mt-1 max-w-md leading-normal font-sans">
                  Track changes in outreach campaigns over time and access conversion metrics on each prospect.
                </p>
              </div>
            </div>

            {/* Dropdown Control */}
            <button
              type="button"
              onClick={() => setTimeFilter(timeFilter === 'This Month' ? 'All Time' : 'This Month')}
              className="btn-secondary py-1.5 px-3.5 text-[12px] flex-shrink-0"
            >
              <span>{timeFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#4B5264]" />
            </button>
          </div>

          {/* Stem Bar Visualizer Chart (Stage stems with tooltip & active circle) */}
          <div className="pt-4 pb-2 px-2 flex items-end justify-between gap-2 h-40 border-b border-[#E2E8F0]">
            {stageStems.map((item, idx) => {
              const stemPixelHeight = Math.max(Math.round((item.numVal / maxVal) * 95), 20);

              return (
                <div key={idx} className="flex flex-col items-center gap-2 group relative">
                  {/* Active Tooltip Pill */}
                  {item.active && (
                    <div className="absolute -top-9 bg-[#17192B] text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-md animate-fade-in whitespace-nowrap">
                      {item.value} reply rate
                    </div>
                  )}
                  {/* Stem Line */}
                  <div className="relative flex flex-col items-center justify-end">
                    <div
                      style={{ height: `${stemPixelHeight}px` }}
                      className={`w-1 rounded-full ${item.active ? 'bg-[#17192B]' : 'bg-[#D1D5DB]'} transition-all duration-300`}
                    />
                    <div className={`w-2.5 h-2.5 rounded-full -mt-1.5 ${item.active ? 'bg-[#F0501E]' : 'bg-[#2563EB]'}`} />
                  </div>
                  {/* Stage Pill Button */}
                  <div
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                      item.active
                        ? 'bg-[#17192B] text-white shadow-xs font-mono'
                        : 'bg-white text-[#4B5264] border border-[#D1D5DB] hover:bg-slate-50 font-mono'
                    }`}
                  >
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Stat Summary Row */}
          <div className="flex items-center justify-between pt-1 text-[12px] text-[#4B5264] font-medium font-mono">
            <span>Overall DB Contacts: <strong className="text-[#14161A]">{s.total}</strong></span>
            <span>Total Replies: <strong className="text-[#14161A]">{s.replied}</strong></span>
            <span>Closed Deals: <strong className="text-[#14161A]">{s.client}</strong></span>
          </div>
        </div>

        {/* ── RIGHT CARD (~40% width, lg:col-span-5): "Recent Pipeline Prospects" ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[18px] font-bold text-[#14161A] font-sans">Recent Pipeline Prospects</h3>
            <Link
              to="/leads"
              className="text-[12px] font-bold text-[#374151] hover:text-[#14161A] transition-colors"
            >
              See all Prospects ({realLeads.length}) &gt;
            </Link>
          </div>

          {/* Real Live Prospects List from Supabase */}
          <div className="space-y-3">
            {leadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#e8eaf0] rounded-[20px] p-5 border border-[#d1d5db] space-y-3">
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-4 w-28" />
                </div>
              ))
            ) : realLeads.length === 0 ? (
              <div className="bg-[#e8eaf0] rounded-[20px] p-8 text-center border border-[#d1d5db] text-[#374151] font-medium text-[13px]">
                No prospects in your database yet.{' '}
                <Link to="/search" className="text-[#F0501E] font-bold hover:underline">
                  Search for leads
                </Link>
              </div>
            ) : (
              realLeads.slice(0, 3).map((lead, idx) => {
                const chipBg = idx === 0 ? 'bg-[#F0501E]' : idx === 1 ? 'bg-[#17192B]' : 'bg-[#5B8DEF]';

                return (
                  <div
                    key={lead.id}
                    className="bg-[#e8eaf0] rounded-[24px] p-5 shadow-xs border border-[#d1d5db] space-y-3 animate-blur-fade-up hover:border-[#F0501E]/40 transition-all text-[#14161A]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${chipBg} text-white font-bold text-sm flex items-center justify-center flex-shrink-0 font-mono shadow-xs`}>
                          {(lead.business_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold text-[#14161A] truncate">
                              {lead.business_name}
                            </span>
                            <LeadStatusBadge status={lead.status} />
                          </div>
                          <div className="text-[11px] text-[#374151] font-semibold font-mono mt-0.5">
                            {lead.category || 'Local Business'} • WhatsApp Outreach
                          </div>
                        </div>
                      </div>

                      <Link
                        to="/leads"
                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-[#374151] transition-colors flex-shrink-0 border border-[#d1d5db]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* Tags Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#374151] border border-[#d1d5db]">
                        {lead.city || 'Local Area'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#374151] border border-[#d1d5db]">
                        Verified Lead
                      </span>
                    </div>

                    <p className="text-[12px] text-[#374151] font-medium leading-relaxed line-clamp-2">
                      {lead.ai_summary || "Scraped via Google Places API and queued for automated WhatsApp outreach campaign."}
                    </p>

                    <div className="text-[11px] text-[#374151] font-bold font-mono flex items-center gap-3 pt-1 border-t border-[#d1d5db]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#6B7280]" />
                        {lead.city || lead.address || 'India'}
                      </span>
                      <span>|</span>
                      <span>{timeAgo(lead.last_contact_at || lead.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION (Equal Height 3-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch">
        {/* Column 1: "Outreach Team" */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[18px] font-bold text-[#14161A] font-sans">Outreach Team</h3>
            <Link to="/inbox" className="text-[12px] font-bold text-[#374151] hover:text-[#14161A]">
              View Inbox
            </Link>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-between">
            {/* Contact Capsule 1 */}
            <div className="bg-[#e8eaf0] border border-[#d1d5db] rounded-[20px] p-3.5 flex items-center justify-between shadow-xs hover:border-[#F0501E]/40 transition-all text-[#14161A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#17192B] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                  AD
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#14161A] truncate">Admin User</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#F0501E] text-white">
                      Superadmin
                    </span>
                  </div>
                  <div className="text-[11px] text-[#374151] font-semibold truncate mt-0.5">n8n Workflow Manager</div>
                </div>
              </div>
              <Link
                to="/inbox"
                className="w-7 h-7 rounded-full bg-white border border-[#d1d5db] hover:bg-gray-100 text-[#14161A] flex items-center justify-center font-bold text-sm flex-shrink-0 cursor-pointer"
                title="Open Inbox"
              >
                +
              </Link>
            </div>

            {/* Contact Capsule 2 */}
            <div className="bg-[#e8eaf0] border border-[#d1d5db] rounded-[20px] p-3.5 flex items-center justify-between shadow-xs hover:border-[#F0501E]/40 transition-all text-[#14161A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#5B8DEF] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#14161A] truncate">WhatsApp Bot</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#5B8DEF] text-white">
                      Automated
                    </span>
                  </div>
                  <div className="text-[11px] text-[#374151] font-semibold truncate mt-0.5">Auto-reply & AI Classifier</div>
                </div>
              </div>
              <Link
                to="/inbox"
                className="w-7 h-7 rounded-full bg-white border border-[#d1d5db] hover:bg-gray-100 text-[#14161A] flex items-center justify-center font-bold text-sm flex-shrink-0 cursor-pointer"
                title="Open Live Inbox"
              >
                +
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: "Scale Lead Generation" */}
        <div className="bg-[#e8eaf0] rounded-[24px] p-6 text-[#14161A] flex flex-col justify-between shadow-xs border border-[#d1d5db]">
          <div className="space-y-2">
            <h4 className="text-[20px] font-bold text-[#14161A] font-sans">
              Scale Lead Generation
            </h4>
            <p className="text-[12px] text-[#374151] font-medium leading-relaxed">
              Scrape local businesses via Google Places API and launch automated WhatsApp outreach campaigns instantly.
            </p>
          </div>

          <Link
            to="/search"
            className="bg-white hover:bg-gray-100 text-[#14161A] font-bold text-[13px] py-3.5 px-5 rounded-full flex items-center justify-between shadow-sm cursor-pointer border border-[#d1d5db] transition-all mt-6"
          >
            <span>Launch New Search</span>
            <ChevronRight className="w-4 h-4 text-[#14161A]" />
          </Link>
        </div>

        {/* Column 3: "Outreach Progress" */}
        <div className="bg-[#e8eaf0] rounded-[24px] p-6 shadow-sm border border-[#d1d5db] flex flex-col justify-between text-[#14161A]">
          <div>
            {/* Header with Date Dropdown */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[18px] font-bold text-[#14161A] font-sans">Outreach Progress</h4>
              <div className="text-[12px] text-[#374151] font-bold flex items-center gap-1 cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-[#374151]" />
                <span>Real-Time</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#374151]" />
              </div>
            </div>

            {/* 3 Labeled Stat Groups Side-by-Side */}
            <div className="grid grid-cols-3 gap-3">
              {/* Group 1: Contacted */}
              <div>
                <div className="text-[11px] text-[#374151] font-bold">Contacted</div>
                <div className="text-3xl font-bold text-[#14161A] mt-1 font-sans">{s.contacted}</div>
                <StatTickMarks count={s.contacted} colorClass="bg-[#5B8DEF]" />
              </div>

              {/* Group 2: Replied */}
              <div>
                <div className="text-[11px] text-[#374151] font-bold">Replied</div>
                <div className="text-3xl font-bold text-[#F0501E] mt-1 font-sans">{s.replied}</div>
                <StatTickMarks count={s.replied} colorClass="bg-[#F0501E]" />
              </div>

              {/* Group 3: Clients Won */}
              <div>
                <div className="text-[11px] text-[#374151] font-bold">Clients Won</div>
                <div className="text-3xl font-bold text-[#17192B] mt-1 font-sans">{s.client}</div>
                <StatTickMarks count={s.client} colorClass="bg-[#17192B]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
