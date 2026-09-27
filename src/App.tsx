import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/context/AuthContext';
import { ApiErrorProvider } from '@/context/ApiErrorContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflinePage } from '@/components/common/OfflinePage';
import { ServerUnreachablePage } from '@/components/common/ServerUnreachablePage';

// Route-level code splitting: the landing video page, legal pages and each CRM screen load on demand.
const LandingPage = lazy(() => import('@/components/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/components/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const PrivacyPage = lazy(() => import('@/components/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/components/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const AppLayout = lazy(() => import('@/components/layout/AppLayout').then((m) => ({ default: m.AppLayout })));
const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('@/components/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const InboxPage = lazy(() => import('@/components/inbox/InboxPage').then((m) => ({ default: m.InboxPage })));
const SearchPage = lazy(() => import('@/components/search/SearchPage').then((m) => ({ default: m.SearchPage })));
const AnalyticsPage = lazy(() => import('@/components/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#e8eaf0] flex items-center justify-center" role="status">
      <span className="text-[11px] uppercase tracking-[0.35em] text-[#374151] font-mono font-bold animate-pulse">Loading</span>
    </div>
  );
}

function LandingRoute() {
  const navigate = useNavigate();
  return <LandingPage onEnterApp={() => navigate('/login')} />;
}

/** Signed-out visitors go to /login and come back to the page they asked for. */
function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ApiErrorProvider>
          <OfflinePage />
          <ServerUnreachablePage />

          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route path="/" element={<LandingRoute />} />
                <Route path="/hero" element={<LandingRoute />} />
                <Route path="/landing" element={<LandingRoute />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />

                <Route
                  element={
                    <AuthGuard>
                      <AppLayout />
                    </AuthGuard>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ApiErrorProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
