import { useState, useMemo } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { useLeads } from '@/hooks/useLeads';
import { Link } from 'react-router-dom';
import { Send, TrendingUp, Users, Award, MapPin, Calendar, Search } from 'lucide-react';

interface CityStat {
  city: string;
  count: number;
  pct: number;
}

const DAY_MS = 86_400_000;

export function AnalyticsPage() {
  const { leads, loading, error } = useLeads();
  const [dateRange, setDateRange] = useState(30);

  const { totals, topCities, trend } = useMemo(() => {
    const cutoff = Date.now() - dateRange * DAY_MS;
    const inRange = leads.filter((l) => new Date(l.created_at).getTime() >= cutoff);

    const counts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    for (const lead of inRange) {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
      const c = lead.city?.trim();
      if (c) cityCounts[c] = (cityCounts[c] || 0) + 1;
    }
    const n = (k: string) => counts[k] || 0;
    const contactedOrLater = inRange.length - n('NEW');

    // Leads contacted per day (by last_contact_at) across the selected window.
    const days = Array.from({ length: dateRange }, () => 0);
    const startOfWindow = new Date();
    startOfWindow.setHours(0, 0, 0, 0);
    const firstDay = startOfWindow.getTime() - (dateRange - 1) * DAY_MS;
    for (const lead of leads) {
      if (!lead.last_contact_at) continue;
      const idx = Math.floor((new Date(lead.last_contact_at).getTime() - firstDay) / DAY_MS);
      if (idx >= 0 && idx < dateRange) days[idx] += 1;
    }

    return {
      totals: {
        sent: contactedOrLater,
        replied: n('REPLIED') + n('INTERESTED') + n('MEETING_BOOKED') + n('CLIENT'),
        repliedOnly: n('REPLIED'),
        activeLeads: inRange.length,
        clients: n('CLIENT'),
        new: n('NEW'),
        contacted: n('CONTACTED'),
        interested: n('INTERESTED'),
        followUp: n('FOLLOW_UP'),
        meetingBooked: n('MEETING_BOOKED'),
        lost: n('LOST'),
      },
      topCities: Object.entries(cityCounts)
        .map(([city, count]): CityStat => ({ city, count, pct: inRange.length ? (count / inRange.length) * 100 : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      trend: { days, firstDay, total: days.reduce((a, b) => a + b, 0) },
    };
  }, [leads, dateRange]);

  const replyRate = totals.sent > 0 ? (totals.replied / totals.sent) * 100 : 0;
  const replyRateStr = replyRate.toFixed(1);
  const animatedReplyRate = useCountUp(Math.round(replyRate));

  const donutArcs = useMemo(() => {
    const statusData = [
      { label: 'Replied', val: totals.repliedOnly, color: '#F0501E' },
      { label: 'Interested / meeting', val: totals.interested + totals.meetingBooked, color: '#10B981' },
      { label: 'Clients won', val: totals.clients, color: '#17192B' },
      { label: 'Other active', val: totals.new + totals.contacted + totals.followUp, color: '#5B8DEF' },
    ];

    const sum = statusData.reduce((acc, d) => acc + d.val, 0) || 1;
    const circumference = 2 * Math.PI * 70; // ~439.8

    let cumulativePct = 0;
    return statusData.map((d) => {
      const pct = d.val / sum;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePct * circumference;
      cumulativePct += pct;
      return {
        ...d,
        pct: Math.round(pct * 100),
        dashArray: strokeDasharray,
        dashOffset: strokeDashoffset,
      };
    });
  }, [totals]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-[20px] p-6 text-[13px] font-medium">
          Could not load analytics: {error.message}
        </div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...trend.days);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans text-[#14161A]">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="eyebrow text-[#4B5264] mb-1">Performance Intelligence</div>
          <h1 className="text-display-lg text-[#14161A]">Analytics Dashboard</h1>
        </div>
      </div>

      {/* ── TOP STAT TILES (4 Column Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-blur-fade-up">
        {/* Messages Sent */}
        <div className="ui-card space-y-1">
          <div className="eyebrow text-[#4B5264] flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-[#B93A0E]" />
            <span>LEADS CONTACTED</span>
          </div>
          <div className="text-display-lg text-[#14161A]">
            {totals.sent}
          </div>
        </div>

        {/* Reply Rate */}
        <div className="ui-card space-y-1">
          <div className="eyebrow text-[#4B5264] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0F9D58]" />
            <span>REPLY RATE</span>
          </div>
          <div className="text-display-lg text-[#14161A]">
            {replyRateStr}%
          </div>
        </div>

        {/* Active Database Leads */}
        <div className="ui-card space-y-1">
          <div className="eyebrow text-[#4B5264] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>ACTIVE LEADS</span>
          </div>
          <div className="text-display-lg text-[#14161A]">
            {totals.activeLeads}
          </div>
        </div>

        {/* Clients Won */}
        <div className="ui-card space-y-1">
          <div className="eyebrow text-[#4B5264] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#B93A0E]" />
            <span>CLIENTS WON</span>
          </div>
          <div className="text-display-lg text-[#14161A]">
            {totals.clients}
          </div>
        </div>
      </div>

      {/* ── REPORTING CANVAS GRID (Balanced 2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* 1. Sparkline Panel */}
          <div className="bg-[#e8eaf0] rounded-[24px] p-6 shadow-xs border border-[#d1d5db] space-y-4 animate-blur-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow text-[#374151] font-bold">Outreach trend ({dateRange} days)</h2>
            </div>

            <div className="text-3xl font-bold font-sans text-[#14161A]">
              {trend.total} <span className="text-[13px] font-normal text-[#374151]">leads last contacted in this window</span>
            </div>

            <div className="h-24 w-full pt-2 flex items-end gap-px" role="img" aria-label={`Daily leads contacted over the last ${dateRange} days, peak ${maxDay} in one day`}>
              {trend.days.map((count, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${count > 0 ? 'bg-[#F0501E]' : 'bg-[#D1D5DB]'}`}
                  style={{ height: `${count > 0 ? Math.max(8, (count / maxDay) * 100) : 4}%` }}
                  title={`${new Date(trend.firstDay + i * DAY_MS).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}: ${count}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-mono text-[#374151]">
              <span>{new Date(trend.firstDay).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
              <span>Today</span>
            </div>
          </div>

          {/* 2. Top Cities Panel */}
          <div className="bg-[#e8eaf0] rounded-[24px] p-6 shadow-xs border border-[#d1d5db] space-y-4 animate-blur-fade-up flex-1 flex flex-col justify-between">
            <div className="eyebrow text-[#374151] font-bold">TOP LOCATIONS BY LEAD COUNT</div>

            {topCities.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 border border-[#d1d5db] text-center space-y-3 my-auto">
                <MapPin className="w-8 h-8 text-[#4B5264] mx-auto" />
                <div>
                  <div className="text-[14px] font-bold text-[#14161A]">No Location Data Recorded</div>
                  <p className="text-[12px] text-[#4B5264] max-w-xs mx-auto mt-1">
                    Discover local leads in target cities to automatically populate geographic location analytics.
                  </p>
                </div>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold bg-[#D44314] text-white hover:bg-[#B93A0E] transition-all shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Discover Leads in a City</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5 my-auto">
                {topCities.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 font-bold text-[#14161A]">
                        <MapPin className="w-3.5 h-3.5 text-[#B93A0E]" />
                        {item.city}
                      </span>
                      <span className="font-mono text-[#4B5264] text-[11px] font-bold">
                        {item.count} leads ({item.pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden border border-[#d1d5db]">
                      <div
                        className="h-full bg-[#F0501E] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(item.pct, 8)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* 1. Large Donut / Radial Progress Chart Centerpiece */}
          <div className="bg-[#e8eaf0] rounded-[24px] p-6 lg:p-7 shadow-xs border border-[#d1d5db] flex flex-col items-center justify-between space-y-6 animate-blur-fade-up">
            <div className="eyebrow text-[#374151] font-bold self-start">
              PIPELINE STATUS DISTRIBUTION & FUNNEL
            </div>

            {/* SVG Radial Donut Chart */}
            <div className="relative w-60 h-60 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#DDE0E7"
                  strokeWidth="14"
                />
                {donutArcs.map((arc, i) => (
                  <circle
                    key={i}
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="14"
                    strokeDasharray={arc.dashArray}
                    strokeDashoffset={arc.dashOffset}
                    className="transition-all duration-700 ease-out"
                  />
                ))}
              </svg>

              {/* Center Hero Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-4xl font-bold font-sans text-[#14161A] tracking-tight">
                  {animatedReplyRate}%
                </div>
                <div className="eyebrow text-[#B93A0E] mt-1 font-bold">
                  RESPONSE RATE
                </div>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-4 border-t border-[#d1d5db]">
              {donutArcs.map((arc, i) => (
                <div key={i} className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: arc.color }}
                    />
                    <span className="text-[11px] text-[#4B5264] font-bold truncate">
                      {arc.label}
                    </span>
                  </div>
                  <div className="text-[15px] font-bold font-mono text-[#14161A] pl-4">
                    {arc.val} <span className="text-[11px] font-normal text-[#4B5264]">({arc.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Date Range Slider Track Control */}
          <div className="bg-[#e8eaf0] rounded-[24px] p-6 shadow-xs border border-[#d1d5db] space-y-4 animate-blur-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow text-[#374151] font-bold">TIME HORIZON FILTER</div>
                <div className="text-sm font-bold text-[#14161A] mt-0.5">
                  Last {dateRange} Days Analysis
                </div>
              </div>

              <div className="text-[12px] font-mono text-[#374151] font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#B93A0E]" />
                <span>Active: {dateRange} Days</span>
              </div>
            </div>

            {/* Track Control */}
            <div className="space-y-2 pt-2">
              <label htmlFor="analytics-range" className="sr-only">Time horizon in days</label>
              <input
                id="analytics-range"
                type="range"
                min="7"
                max="90"
                step="1"
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="w-full accent-[#F0501E] cursor-pointer h-2 bg-white rounded-lg border border-[#d1d5db]"
              />

              <div className="relative h-4 text-[10px] font-mono text-[#374151] font-bold" aria-hidden="true">
                {[7, 30, 60, 90].map((d) => {
                  const pct = ((d - 7) / (90 - 7)) * 100;
                  return (
                    <span
                      key={d}
                      className="absolute top-0 whitespace-nowrap"
                      style={{ left: `${pct}%`, transform: `translateX(-${pct}%)` }}
                    >
                      {d} Days
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

