import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/components/auth/LoginPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { LeadsPage } from '@/components/leads/LeadsPage';
import { InboxPage } from '@/components/inbox/InboxPage';
import { SearchPage } from '@/components/search/SearchPage';
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage';
import { LandingPage } from '@/components/landing/LandingPage';
import { PrivacyPage } from '@/components/legal/PrivacyPage';
import { TermsPage } from '@/components/legal/TermsPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ApiErrorProvider } from '@/context/ApiErrorContext';
import { OfflinePage } from '@/components/common/OfflinePage';
import { ServerUnreachablePage } from '@/components/common/ServerUnreachablePage';

/* Landing page — "Open dashboard" button goes to /login */
function LandingRoute() {
  const navigate = useNavigate();
  return <LandingPage onEnterApp={() => navigate('/login')} />;
}

/* AuthGuard: if not logged in, redirect to /hero (landing) */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8eaf0] flex items-center justify-center">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#374151] font-mono font-bold animate-pulse">
          Loading
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/hero" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ApiErrorProvider>
        {/* Full-screen Takeover Overlays */}
        <OfflinePage />
        <ServerUnreachablePage />

        <BrowserRouter>
          <Routes>
            {/* ── Public: root → landing page ── */}
            <Route path="/"        element={<LandingRoute />} />
            <Route path="/hero"    element={<LandingRoute />} />
            <Route path="/landing" element={<LandingRoute />} />

            {/* ── Public: login & legal pages ── */}
            <Route path="/login"   element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms"   element={<TermsPage />} />

            {/* ── Protected: CRM app ── */}
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/leads"     element={<LeadsPage />} />
                      <Route path="/inbox"     element={<InboxPage />} />
                      <Route path="/search"    element={<SearchPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
                    </Route>
                  </Routes>
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </ApiErrorProvider>
    </ErrorBoundary>
  );
}
