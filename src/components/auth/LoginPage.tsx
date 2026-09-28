import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Loader2, Layers } from 'lucide-react';
import { AlmoayyedGradient } from '@/components/common/AlmoayyedGradient';

export function LoginPage() {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (user) {
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isSignUp) {
      const err = await signUp(email, password);
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Account created! Please check your email inbox to confirm your account.');
      }
    } else {
      // On success the auth listener sets `user` and the <Navigate> above redirects.
      const err = await signIn(email, password);
      if (err) setError(err.message);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const err = await signInWithGoogle();
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="dark-surface relative min-h-screen bg-[#E8EAF0] flex items-center justify-center p-4 sm:p-6 font-sans text-[#14161A] overflow-hidden">
      {/* ── Bloom Field Animated Mesh Gradient Background ── */}
      <AlmoayyedGradient opacity={0.85} />

      {/* ── BOTTOM BLUR SCRIM (z-index 1) ── */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none backdrop-blur-md"
        style={{
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 60%)',
          maskImage: 'linear-gradient(to top, black 0%, transparent 60%)',
        }}
      />

      {/* ── LOGIN GLASS CARD (z-index 10) ── */}
      <div className="relative z-10 w-full max-w-sm bg-[#0d1015]/85 backdrop-blur-2xl rounded-[28px] p-8 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] border border-white/[0.12] space-y-5 animate-blur-fade-up">
        {/* Logo & Wordmark */}
        <div className="text-center space-y-2">
          <Link to="/hero" className="inline-block group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-[#F0501E] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#F0501E]/30 group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-[36px] leading-tight tracking-tight text-white font-display font-normal mt-2 group-hover:text-white/90 transition-colors">
              Lead-Scrapper
            </h1>
          </Link>
          <p className="eyebrow text-white/70">
            {isSignUp ? 'Create Account' : 'Sign in to dashboard'}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div role="alert" className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-[14px] px-4 py-3 animate-fade-in font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div role="status" className="text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-[14px] px-4 py-3 animate-fade-in font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Sign In With Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full rounded-full bg-white text-[#14161A] hover:bg-gray-100 font-bold py-3 px-4 text-[13px] flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#14161A]" />
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0d1015] px-3 text-[10px] uppercase font-bold text-white/70 tracking-widest absolute">
            or email
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="eyebrow text-white/75 block mb-1.5 font-bold">Email Address</label>
            <input
              id="login-email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white text-[#14161A] border border-[#d1d5db] placeholder:text-[#6B7280] rounded-full text-[13px] px-4 py-3 outline-none focus:border-[#F0501E] focus:ring-2 focus:ring-[#F0501E]/20 transition-all font-medium shadow-xs"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="eyebrow text-white/75 block mb-1.5 font-bold">Password</label>
            <div className="relative">
              <input
                id="login-password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white text-[#14161A] border border-[#d1d5db] placeholder:text-[#6B7280] rounded-full text-[13px] pl-4 pr-11 py-3 outline-none focus:border-[#F0501E] focus:ring-2 focus:ring-[#F0501E]/20 transition-all font-medium shadow-xs"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[#4B5264] hover:text-[#F0501E] hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#D44314] hover:bg-[#B93A0E] text-white text-[14px] font-semibold py-3.5 transition-all active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#F0501E]/30 mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="text-center pt-2 border-t border-white/[0.08] space-y-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-[12px] text-white/75 hover:text-white underline-offset-2 hover:underline font-medium transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/70 pt-1">
            <Link to="/privacy" className="hover:text-white/80 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white/80 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
