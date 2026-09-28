import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AuthContext, JUST_SIGNED_IN_KEY, type AuthContextValue } from '@/context/authState';
import { queryKeys } from '@/lib/queryClient';
import { GMAIL_OAUTH_OPTIONS, saveGmailGrant } from '@/services/gmailService';

function markFreshSignIn(on: boolean) {
  try {
    if (on) sessionStorage.setItem(JUST_SIGNED_IN_KEY, 'true');
    else sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
  } catch { /* storage unavailable */ }
}

/**
 * Single owner of the Supabase auth session. Every consumer reads the same state,
 * so there is one getSession() call and one onAuthStateChange listener per app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const savedGrant = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      // Never let one account's cached CRM data survive into another session.
      if (event === 'SIGNED_OUT') queryClient.clear();
      // Google returns a refresh token after sign-in or "Connect Gmail". Store it server-side once,
      // outside this callback (supabase-js deadlocks on auth calls made inside it).
      const grant = next?.provider_refresh_token;
      if (grant && savedGrant.current !== grant) {
        savedGrant.current = grant;
        const userId = next.user.id;
        setTimeout(() => {
          saveGmailGrant(grant)
            .then((status) => queryClient.setQueryData(queryKeys.gmailStatus(userId), status))
            .catch((err) => {
              queryClient.setQueryData(queryKeys.gmailStatus(userId), {
                connected: false,
                email: null,
                error: err instanceof Error ? err.message : 'Gmail could not be connected.',
              });
            });
        }, 0);
      }
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Flag first: onAuthStateChange fires (and the app mounts) before this promise resolves.
    markFreshSignIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) markFreshSignIn(false);
    return error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    return error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Flag persists in sessionStorage through the OAuth redirect.
    markFreshSignIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Ask for Gmail sending up front so cold emails go out from this account.
      options: { ...GMAIL_OAUTH_OPTIONS, redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) markFreshSignIn(false);
    return error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signInWithGoogle, signOut }),
    [session, loading, signIn, signUp, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
