import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useCountUp } from '@/hooks/useCountUp';
import { useAuth } from '@/hooks/useAuth';
import { isOutreachAuthorized } from '@/services/permissionService';
import { Link } from 'react-router-dom';
import {
  Send,
  TrendingUp,
  Users,
  Award,
  MapPin,
  Calendar,
  Search,
} from 'lucide-react';

interface CityStat {
  city: string;
  count: number;
  pct: number;
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    sent: 0,
    replied: 0,
    activeLeads: 0,
    clients: 0,
    new: 0,
    contacted: 0,
    interested: 0,
    followUp: 0,
    meetingBooked: 0,
  });
  const [topCities, setTopCities] = useState<CityStat[]>([]);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalyticsData() {
      try {
        setLoading(true);

        let query = supabase
          .from('leads')
          .select('id, status, city, created_at, last_contact_at, assigned_user_id');

        if (user?.id) {
          query = query.eq('assigned_user_id', user.id);
        }

        const { data: leads, error } = await query;

        if (error || !leads || !isMounted) {
          if (isMounted) setLoading(false);
          return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRange);

        // Filter leads created or updated within date range if timestamp exists
        const filteredLeads = leads.filter((lead) => {
          if (!lead.created_at) return true;
          return new Date(lead.created_at) >= cutoffDate;
        });

        let newCount = 0;
        let contactedCount = 0;
        let repliedCount = 0;
        let interestedCount = 0;
        let followUpCount = 0;
        let meetingBookedCount = 0;
        let clientCount = 0;

        const cityCounts: Record<string, number> = {};

        filteredLeads.forEach((lead) => {
          const st = (lead.status || '').toUpperCase();
          if (st === 'NEW') newCount++;
          else if (st === 'CONTACTED') contactedCount++;
          else if (st === 'REPLIED') repliedCount++;
          else if (st === 'INTERESTED') interestedCount++;
          else if (st === 'FOLLOW_UP' || st === 'FOLLOW UP') followUpCount++;
          else if (st === 'MEETING_BOOKED' || st === 'MEETING BOOKED') meetingBookedCount++;
          else if (st === 'CLIENT') clientCount++;

          if (lead.city && lead.city.trim()) {
            const c = lead.city.trim();
            cityCounts[c] = (cityCounts[c] || 0) + 1;
          }
        });

        const totalLeadsCount = filteredLeads.length;
        const cityList: CityStat[] = Object.entries(cityCounts)
          .map(([city, count]) => ({
            city,
            count,
            pct: totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const totalSent = contactedCount + repliedCount + interestedCount + followUpCount + meetingBookedCount + clientCount;

        if (isMounted) {
          setTotals({
            sent: totalSent,
            replied: repliedCount,
            activeLeads: totalLeadsCount,
            clients: clientCount,
            new: newCount,
            contacted: contactedCount,
            interested: interestedCount,
            followUp: followUpCount,
            meetingBooked: meetingBookedCount,
          });

          setTopCities(cityList);
        }
      } catch (err) {
        console.error('Analytics real-time load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAnalyticsData();

    // ── Supabase Real-Time Subscriptions ──
    const leadsChannel = supabase
      .channel('analytics-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        loadAnalyticsData();
      })
      .subscribe();

    const convChannel = supabase
      .channel('analytics-conv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadAnalyticsData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(convChannel);
    };
  }, [dateRange, user?.email, user?.id]);

  const replyRate = totals.sent > 0 ? (totals.replied / totals.sent) * 100 : 0;
  const replyRateStr = replyRate.toFixed(1);
  const animatedReplyRate = useCountUp(Math.round(replyRate));

  const donutArcs = useMemo(() => {
    const statusData = [
      { label: 'Replied', val: totals.replied, color: '#F0501E' },
      { label: 'Interested', val: totals.interested, color: '#10B981' },
      { label: 'Clients Won', val: totals.clients, color: '#17192B' },
      { label: 'Other Active', val: totals.new + totals.contacted + totals.followUp, color: '#5B8DEF' },
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
    <div className="relative p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans text-[#14161A] select-none bg-transparent">
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
            <Send className="w-3.5 h-3.5 text-[#F0501E]" />
            <span>MESSAGES SENT</span>
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
            <Award className="w-3.5 h-3.5 text-[#F0501E]" />
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
              <div className="eyebrow text-[#374151] font-bold">OUTREACH TREND ({dateRange} DAYS)</div>
            </div>

            <div className="text-3xl font-bold font-sans text-[#14161A]">
              {totals.sent} <span className="text-[13px] font-normal text-[#475569]">messages sent</span>
            </div>

            {/* Single-color Accent Sparkline Path */}
            <div className="h-20 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 50">
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0501E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F0501E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,40 Q 30,10 60,30 T 120,15 T 180,35 T 240,10 T 300,25 L 300,50 L 0,50 Z"
                  fill="url(#sparkline-grad)"
                />
                <path
                  d="M 0,40 Q 30,10 60,30 T 120,15 T 180,35 T 240,10 T 300,25"
                  fill="none"
                  stroke="#F0501E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* 2. Top Cities Panel */}
          <div className="bg-[#e8eaf0] rounded-[24px] p-6 shadow-xs border border-[#d1d5db] space-y-4 animate-blur-fade-up flex-1 flex flex-col justify-between">
            <div className="eyebrow text-[#374151] font-bold">TOP LOCATIONS BY LEAD COUNT</div>

            {topCities.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 border border-[#d1d5db] text-center space-y-3 my-auto">
                <MapPin className="w-8 h-8 text-[#94a3b8] mx-auto" />
                <div>
                  <div className="text-[14px] font-bold text-[#14161A]">No Location Data Recorded</div>
                  <p className="text-[12px] text-[#64748b] max-w-xs mx-auto mt-1">
                    Discover local leads in target cities to automatically populate geographic location analytics.
                  </p>
                </div>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold bg-[#F0501E] text-white hover:bg-[#F0501E]/90 transition-all shadow-xs cursor-pointer"
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
                        <MapPin className="w-3.5 h-3.5 text-[#F0501E]" />
                        {item.city}
                      </span>
                      <span className="font-mono text-[#475569] text-[11px] font-bold">
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
                  stroke="#ffffff"
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
                <div className="eyebrow text-[#F0501E] mt-1 font-bold">
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
                    <span className="text-[11px] text-[#475569] font-bold truncate">
                      {arc.label}
                    </span>
                  </div>
                  <div className="text-[15px] font-bold font-mono text-[#14161A] pl-4">
                    {arc.val} <span className="text-[11px] font-normal text-[#64748b]">({arc.pct}%)</span>
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
                <Calendar className="w-3.5 h-3.5 text-[#F0501E]" />
                <span>Active: {dateRange} Days</span>
              </div>
            </div>

            {/* Track Control */}
            <div className="space-y-2 pt-2">
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="w-full accent-[#F0501E] cursor-pointer h-2 bg-white rounded-lg border border-[#d1d5db]"
              />

              <div className="flex justify-between text-[10px] font-mono text-[#374151] font-bold">
                <span>7 Days</span>
                <span>30 Days</span>
                <span>60 Days</span>
                <span>90 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

