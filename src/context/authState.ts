import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

/** Set before sign-in so AppLayout can show the welcome modal once after a fresh login. */
export const JUST_SIGNED_IN_KEY = 'just-signed-in';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Error | null>;
  signUp: (email: string, password: string) => Promise<Error | null>;
  signInWithGoogle: () => Promise<Error | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

