import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Sparkles,
  ChevronDown,
  Layers,
  Search as SearchIcon,
  LogOut,
  MessageSquare,
  UserPlus,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInbox } from '@/hooks/useConversations';
import { AlmoayyedGradient } from '@/components/common/AlmoayyedGradient';
import { WelcomeServicesModal } from '@/components/common/WelcomeServicesModal';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leads', label: 'Leads' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/search', label: 'Search' },
  { to: '/analytics', label: 'Analytics' },
];

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string;
  type: 'message' | 'lead';
}

export function AppLayout() {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const { user, signOut } = useAuth();
  const { unreadCount, refetch: refetchInbox } = useInbox();
  const location = useLocation();
  const navigate = useNavigate();

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time notifications from Supabase
  useEffect(() => {
    async function fetchNotifications() {
      try {
        let convQuery = supabase
          .from('conversations')
          .select('id, lead_id, message, timestamp, direction, status, leads!inner(business_name, assigned_user_id)')
          .eq('direction', 'INBOUND')
          .order('timestamp', { ascending: false })
          .limit(4);

        let leadQuery = supabase
          .from('leads')
          .select('id, business_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(4);

        if (user?.id) {
          convQuery = convQuery.eq('leads.assigned_user_id', user.id);
          leadQuery = leadQuery.eq('assigned_user_id', user.id);
        }

        const { data: convs } = await convQuery;
        const { data: leads } = await leadQuery;

        const items: NotificationItem[] = [];

        if (convs && convs.length > 0) {
          convs.forEach((c) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const leadName = (c as any).leads?.business_name || 'Prospect';
            items.push({
              id: `conv-${c.id}`,
              title: `New Message from ${leadName}`,
              body: c.message || 'Sent an attachment or message',
              time: c.timestamp,
              read: c.status === 'read',
              link: '/inbox',
              type: 'message',
            });
          });
        }

        if (leads && leads.length > 0) {
          leads.forEach((l) => {
            items.push({
              id: `lead-${l.id}`,
              title: `Lead Logged: ${l.business_name}`,
              body: `Current status: ${l.status || 'NEW'}`,
              time: l.created_at,
              read: true,
              link: '/leads',
              type: 'lead',
            });
          });
        }

        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setNotifications(items.slice(0, 6));
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }

    fetchNotifications();

    const channel = supabase
      .channel('navbar-notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await supabase
        .from('conversations')
        .update({ status: 'read' })
        .eq('direction', 'INBOUND')
        .neq('status', 'read');

      refetchInbox();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const [totalOutboundCount, setTotalOutboundCount] = useState<number>(0);

  useEffect(() => {
    async function fetchOutboundCount() {
      try {
        let query = supabase
          .from('conversations')
          .select('*, leads!inner(assigned_user_id)', { count: 'exact', head: true })
          .eq('direction', 'OUTBOUND');

        if (user?.id) {
          query = query.eq('leads.assigned_user_id', user.id);
        }

        const { count } = await query;
        setTotalOutboundCount(count || 0);
      } catch (err) {
        console.error('Failed to fetch total outbound count:', err);
      }
    }
    fetchOutboundCount();

    const channel = supabase
      .channel('layout-outbound-spend')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchOutboundCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // ── Welcome modal: show once immediately after a fresh sign-in ──
  useEffect(() => {
    if (!user?.id) return;
    let justSignedIn = false;
    try { justSignedIn = sessionStorage.getItem('just-signed-in') === 'true'; } catch {}
    if (justSignedIn) {
      // Consume the flag so it won't fire again on refresh
      try { sessionStorage.removeItem('just-signed-in'); } catch {}
      setShowWelcome(true);
    }
  }, [user?.id]);

  const handleWelcomeClose = useCallback(() => {
    setShowWelcome(false);
  }, []);

  const handleWelcomeSelect = useCallback(
    (service: { title: string }) => {
      setShowWelcome(false);
      // Navigate to search with the selected service as context
      navigate(`/search?service=${encodeURIComponent(service.title)}`);
    },
    [navigate]
  );

  return (
    <div className="relative min-h-screen bg-[#E8EAF0] font-sans selection:bg-[#F0501E]/20 select-none flex flex-col">
      {/* ── Bloom Field Animated Mesh Gradient Background ── */}
      <AlmoayyedGradient opacity={0.65} />

      {/* ── Edge-to-Edge App Container ── */}
      <div className="relative z-10 min-h-screen flex flex-col flex-1">
        
        {/* ── Top Header Navbar ── */}
        <header className="px-6 lg:px-10 py-3.5 border-b border-[#17192B] flex items-center justify-between gap-6 bg-[#17192B] text-white flex-wrap sm:flex-nowrap shadow-md">
          
          {/* Left: Brand Logo + Nav links */}
          <div className="flex items-center gap-8">
            <div
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F0501E] text-white flex items-center justify-center shadow-accent group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[22px] font-display text-white tracking-tight">
                Lead-Scrapper
              </span>
            </div>

            {/* Horizontal Nav Links */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `relative text-[13px] transition-all duration-150 flex items-center gap-1.5 py-1 ${
                      isActive
                        ? 'text-white font-bold border-b-2 border-[#F0501E]'
                        : 'text-[#8A90A2] hover:text-white font-medium'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  {item.label === 'Inbox' && unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#F0501E] text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, cities..."
                className="quiet-input !pl-11 !pr-4 transition-all font-medium"
              />
            </form>

            {/* ── NOTIFICATIONS BUTTON & DROPDOWN ── */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                className="relative w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-[#ECEEF2] flex items-center justify-center text-[#6B7280] hover:text-[#14161A] transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {(unreadCount > 0 || unreadNotifCount > 0) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#F0501E] border-2 border-white" />
                )}
              </button>

              {/* Small Floating Notifications Popover */}
              {notifMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#e8eaf0] border border-[#d1d5db] rounded-[24px] p-4 z-50 animate-fade-in shadow-2xl space-y-3 text-[#14161A]">
                  {/* Header */}
                  <div className="flex items-center justify-between px-1 border-b border-[#d1d5db] pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#F0501E]" />
                      <span className="text-[14px] font-bold font-sans">Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0501E] text-white font-mono">
                          {unreadNotifCount} new
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#374151] hover:text-[#14161A] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark all read</span>
                    </button>
                  </div>

                  {/* List Items */}
                  <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-[#6B7280] text-[12px] font-medium">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifMenuOpen(false);
                            navigate(n.link);
                          }}
                          className={`p-3 rounded-[16px] bg-white border border-[#d1d5db] hover:border-[#F0501E]/40 hover:shadow-sm cursor-pointer transition-all flex items-start gap-3 ${
                            !n.read ? 'border-l-4 border-l-[#F0501E]' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-mono text-[11px] font-bold ${
                            n.type === 'message' ? 'bg-[#F0501E]' : 'bg-[#17192B]'
                          }`}>
                            {n.type === 'message' ? <MessageSquare className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-bold text-[#14161A] truncate">{n.title}</span>
                              <span className="text-[10px] text-[#6B7280] font-mono flex-shrink-0">{timeAgo(n.time)}</span>
                            </div>
                            <p className="text-[11px] text-[#374151] font-medium leading-relaxed truncate">{n.body}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-[#d1d5db] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/inbox');
                      }}
                      className="text-[12px] font-bold text-[#F0501E] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Conversations in Inbox</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/search')}
              className="w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-[#ECEEF2] flex items-center justify-center text-[#6B7280] hover:text-[#14161A] transition-colors cursor-pointer"
              title="Find Leads"
            >
              <Sparkles className="w-4 h-4 text-[#F0501E]" />
            </button>

            {user && (
              <div ref={accountRef} className="relative pl-1">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-white/50 border border-transparent hover:border-[#ECEEF2] transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#17192B] text-white font-mono text-[12px] font-bold flex items-center justify-center shadow-xs">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#6B7280] transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#e8eaf0] border border-[#d1d5db] rounded-[24px] p-3 z-50 animate-fade-in shadow-2xl space-y-2 text-[#14161A]">
                    {/* User Gmail Header */}
                    <div className="px-3 py-2 border-b border-[#cbd5e1]">
                      <div className="text-[10px] eyebrow text-[#374151] font-bold">LOGGED IN GMAIL</div>
                      <div className="text-[13px] text-[#14161A] font-bold truncate mt-0.5" title={user.email}>
                        {user.email}
                      </div>
                    </div>

                    {/* WhatsApp Spend Summary Card */}
                    <div className="bg-white rounded-[16px] p-3 border border-[#d1d5db] space-y-2 shadow-xs">
                      <div className="text-[10px] eyebrow text-[#F0501E] font-bold">WHATSAPP SPEND SUMMARY</div>
                      
                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-[#374151]">
                          <span>Outbound Sent:</span>
                          <strong className="text-[#14161A]">{totalOutboundCount} msgs</strong>
                        </div>
                        <div className="flex items-center justify-between text-[#374151]">
                          <span>Rate per Message:</span>
                          <strong className="text-[#64748b]">₹0.80</strong>
                        </div>
                        <div className="flex items-center justify-between text-[12px] pt-1.5 border-t border-[#f1f5f9]">
                          <span className="font-sans font-bold text-[#14161A]">Total Spend:</span>
                          <strong className="text-[#F0501E] font-bold text-[14px]">
                            ₹{(totalOutboundCount * 0.80).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Account</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Mobile nav bar */}
        <div className="md:hidden px-4 py-2.5 border-b border-[#ECEEF2] bg-[#e8eaf0] flex items-center justify-between overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${
                  isActive ? 'bg-[#17192B] text-white' : 'text-[#6B7280]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* ── MAIN CONTENT (Edge to Edge) ── */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <div key={location.pathname} className="h-full">
            <Outlet />
          </div>
        </main>

        {/* ── APP FOOTER ── */}
        <footer className="px-6 lg:px-10 py-3 border-t border-[#d1d5db] bg-[#e8eaf0]/80 backdrop-blur-xs flex items-center justify-between text-[11px] text-[#64748b] font-mono">
          <span>Lead-Scrapper v2.4 SaaS Production</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-[#14161A] transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#14161A] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
      {/* ── Welcome Services Modal (one-time post-auth) ── */}
      <WelcomeServicesModal
        open={showWelcome}
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        onClose={handleWelcomeClose}
        onSelect={handleWelcomeSelect}
      />
    </div>
  );
}
