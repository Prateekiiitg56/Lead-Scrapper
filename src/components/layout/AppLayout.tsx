import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, Sparkles, ChevronDown, Layers, Search as SearchIcon, LogOut, MessageSquare, UserPlus, CheckCheck, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useInbox } from '@/hooks/useConversations';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { queryKeys } from '@/lib/queryClient';
import { AlmoayyedGradient } from '@/components/common/AlmoayyedGradient';
import { WelcomeServicesModal } from '@/components/common/WelcomeServicesModal';
import { JUST_SIGNED_IN_KEY } from '@/context/authState';
import { fetchNotifications, fetchOutboundCount, markAllInboundRead } from '@/services/conversationService';
import { timeAgo } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leads', label: 'Leads' },
  { to: '/job-signals', label: 'Job Signals' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/search', label: 'Search' },
  { to: '/analytics', label: 'Analytics' },
];

const WHATSAPP_RATE_INR = 0.8;

/** Close a popover on outside click or Escape, returning focus to its trigger. */
function usePopover(open: boolean, setOpen: (v: boolean) => void, containerRef: RefObject<HTMLElement | null>, triggerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, containerRef, triggerRef]);
}

export function AppLayout() {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return sessionStorage.getItem(JUST_SIGNED_IN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { unreadCount } = useInbox();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useRealtimeSync(userId);

  const notifRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  usePopover(notifMenuOpen, setNotifMenuOpen, notifRef, notifTriggerRef);
  usePopover(accountMenuOpen, setAccountMenuOpen, accountRef, accountTriggerRef);

  // Close menus when the route changes.
  useEffect(() => {
    setNotifMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  // Consume the fresh-sign-in flag once so a refresh does not show the welcome modal again.
  useEffect(() => {
    if (showWelcome) {
      try { sessionStorage.removeItem(JUST_SIGNED_IN_KEY); } catch { /* ignore */ }
    }
  }, [showWelcome]);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });
  const notifications = notificationsQuery.data ?? [];

  const outboundQuery = useQuery({
    queryKey: queryKeys.outboundCount(userId),
    queryFn: () => fetchOutboundCount(userId!),
    enabled: !!userId && accountMenuOpen,
  });

  const markAllRead = useMutation({
    mutationFn: markAllInboundRead,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox(userId) });
      queryClient.invalidateQueries({ queryKey: ['thread'] });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/leads?search=${encodeURIComponent(q)}`);
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0 || unreadNotifCount > 0;

  const handleWelcomeClose = useCallback(() => setShowWelcome(false), []);
  const handleWelcomeSelect = useCallback(() => {
    setShowWelcome(false);
    navigate('/search');
  }, [navigate]);

  const outboundCount = outboundQuery.data ?? 0;

  return (
    <div className="relative min-h-screen bg-[#E8EAF0] font-sans selection:bg-[#F0501E]/20 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10001] focus:bg-white focus:text-[#14161A] focus:px-4 focus:py-2 focus:rounded-full focus:shadow-md"
      >
        Skip to content
      </a>
      <AlmoayyedGradient opacity={0.65} />

      <div className="relative z-10 min-h-screen flex flex-col flex-1">
        <header className="dark-surface px-4 sm:px-6 lg:px-10 py-3 border-b border-[#17192B] flex items-center justify-between gap-3 sm:gap-6 bg-[#17192B] text-white shadow-md">
          <div className="flex items-center gap-8 min-w-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group min-w-0" aria-label="Lead-Scrapper dashboard">
              <span className="w-9 h-9 rounded-xl bg-[#F0501E] text-white flex items-center justify-center shadow-accent group-hover:scale-105 transition-transform flex-shrink-0" aria-hidden="true">
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </span>
              <span className="text-[19px] sm:text-[22px] font-display text-white tracking-tight truncate">Lead-Scrapper</span>
            </Link>

            <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative text-[13px] transition-colors duration-150 flex items-center gap-1.5 py-1 border-b-2 ${
                      isActive ? 'text-white font-bold border-[#F0501E]' : 'text-[#A9AEBD] hover:text-white font-medium border-transparent'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  {item.label === 'Inbox' && unreadCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-[#D44314] text-white text-[10px] font-bold font-mono flex items-center justify-center leading-none">
                      {unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <form onSubmit={handleSearchSubmit} role="search" className="relative hidden lg:block w-64">
              <label htmlFor="header-lead-search" className="sr-only">Search leads</label>
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" aria-hidden="true" />
              <input
                id="header-lead-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, cities..."
                className="quiet-input !pl-11 !pr-4 font-medium"
              />
            </form>

            <div ref={notifRef} className="relative">
              <button
                ref={notifTriggerRef}
                type="button"
                onClick={() => setNotifMenuOpen((v) => !v)}
                aria-expanded={notifMenuOpen}
                aria-haspopup="true"
                aria-label={hasUnread ? 'Notifications, unread items' : 'Notifications'}
                className="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {hasUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#F0501E] border-2 border-[#17192B]" aria-hidden="true" />}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] bg-[#e8eaf0] border border-[#d1d5db] rounded-[24px] p-4 z-50 animate-fade-in shadow-2xl space-y-3 text-[#14161A]">
                  <div className="flex items-center justify-between px-1 border-b border-[#d1d5db] pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#B93A0E]" aria-hidden="true" />
                      <h2 className="text-[14px] font-bold">Notifications</h2>
                      {unreadNotifCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D44314] text-white font-mono">{unreadNotifCount} new</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => markAllRead.mutate()}
                      disabled={markAllRead.isPending || !hasUnread}
                      className="text-[11px] text-[#374151] hover:text-[#14161A] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Mark all read</span>
                    </button>
                  </div>
                  {markAllRead.isError && (
                    <p role="alert" className="text-[11px] text-red-700 font-medium px-1">Could not mark messages read. Try again.</p>
                  )}

                  <ul className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                    {notificationsQuery.isPending ? (
                      <li className="skeleton h-14" aria-label="Loading notifications" />
                    ) : notificationsQuery.isError ? (
                      <li className="text-center py-6 text-red-700 text-[12px] font-medium">Could not load notifications.</li>
                    ) : notifications.length === 0 ? (
                      <li className="text-center py-8 text-[#4B5264] text-[12px] font-medium">No notifications right now.</li>
                    ) : (
                      notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => navigate(n.link)}
                            className={`w-full text-left p-3 rounded-[16px] bg-white border border-[#d1d5db] hover:border-[#F0501E]/40 hover:shadow-sm cursor-pointer transition-all flex items-start gap-3 ${
                              !n.read ? 'border-l-4 border-l-[#F0501E]' : ''
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${n.type === 'message' ? 'bg-[#D44314]' : 'bg-[#17192B]'}`}
                              aria-hidden="true"
                            >
                              {n.type === 'message' ? <MessageSquare className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            </span>
                            <span className="min-w-0 flex-1 space-y-0.5">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-bold text-[#14161A] truncate">
                                  {!n.read && <span className="sr-only">Unread: </span>}
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-[#4B5264] font-mono flex-shrink-0">{timeAgo(n.time)}</span>
                              </span>
                              <span className="block text-[11px] text-[#374151] font-medium leading-relaxed truncate">{n.body}</span>
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>

                  <div className="pt-2 border-t border-[#d1d5db] text-center">
                    <Link to="/inbox" className="text-[12px] font-bold text-[#B93A0E] hover:underline inline-flex items-center gap-1">
                      <span>View all conversations in Inbox</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/search"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 items-center justify-center transition-colors"
              aria-label="Find new leads"
              title="Find new leads"
            >
              <Sparkles className="w-4 h-4 text-[#F0501E]" aria-hidden="true" />
            </Link>

            {user && (
              <div ref={accountRef} className="relative">
                <button
                  ref={accountTriggerRef}
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
                  className="flex items-center gap-1.5 p-0.5 pr-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-full bg-white text-[#17192B] font-mono text-[12px] font-bold flex items-center justify-center" aria-hidden="true">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/80 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#e8eaf0] border border-[#d1d5db] rounded-[24px] p-3 z-50 animate-fade-in shadow-2xl space-y-2 text-[#14161A]">
                    <div className="px-3 py-2 border-b border-[#cbd5e1]">
                      <div className="text-[10px] eyebrow text-[#374151] font-bold">Signed in as</div>
                      <div className="text-[13px] text-[#14161A] font-bold truncate mt-0.5" title={user.email}>{user.email}</div>
                    </div>

                    <div className="bg-white rounded-[16px] p-3 border border-[#d1d5db] space-y-2 shadow-xs">
                      <div className="text-[10px] eyebrow text-[#B93A0E] font-bold">WhatsApp spend (estimate)</div>
                      {outboundQuery.isError ? (
                        <p className="text-[11px] text-red-700 font-medium">Could not load message count.</p>
                      ) : (
                        <dl className="space-y-1 text-[11px] font-mono">
                          <div className="flex items-center justify-between text-[#374151]">
                            <dt>Messages sent</dt>
                            <dd className="font-bold text-[#14161A]">{outboundQuery.isPending ? '…' : outboundCount}</dd>
                          </div>
                          <div className="flex items-center justify-between text-[#374151]">
                            <dt>Rate per message</dt>
                            <dd className="font-bold text-[#4B5264]">₹{WHATSAPP_RATE_INR.toFixed(2)}</dd>
                          </div>
                          <div className="flex items-center justify-between text-[12px] pt-1.5 border-t border-[#f1f5f9]">
                            <dt className="font-sans font-bold text-[#14161A]">Total</dt>
                            <dd className="text-[#B93A0E] font-bold text-[14px]">₹{(outboundCount * WHATSAPP_RATE_INR).toFixed(2)}</dd>
                          </div>
                        </dl>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <nav aria-label="Primary" className="md:hidden px-3 py-2 border-b border-[#D1D5DB] bg-[#e8eaf0] flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isActive ? 'bg-[#17192B] text-white' : 'text-[#374151] hover:bg-white/60'
                }`
              }
            >
              {item.label}
              {item.label === 'Inbox' && unreadCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-[#D44314] text-white text-[10px] font-bold font-mono flex items-center justify-center">
                  {unreadCount}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <main id="main-content" tabIndex={-1} className="flex-1 bg-transparent outline-none">
          <div key={location.pathname} className="h-full">
            <Outlet />
          </div>
        </main>

        <footer className="px-4 sm:px-6 lg:px-10 py-3 border-t border-[#d1d5db] bg-[#e8eaf0]/80 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4B5264] font-mono">
          <span>Lead-Scrapper</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-[#14161A] transition-colors">Privacy Policy</Link>
            <span aria-hidden="true">•</span>
            <Link to="/terms" className="hover:text-[#14161A] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>

      <WelcomeServicesModal
        open={showWelcome}
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        onClose={handleWelcomeClose}
        onSelect={handleWelcomeSelect}
      />
    </div>
  );
}
