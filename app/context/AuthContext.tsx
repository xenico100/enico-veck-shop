'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { createClient } from '@/utils/supabase/client';

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fallbackName = user.email?.split('@')[0] ?? 'User';
  const name = (metadata.full_name as string | undefined)
    ?? (metadata.name as string | undefined)
    ?? fallbackName;

  return {
    id: user.id,
    name,
    email: user.email ?? '',
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError) {
        setError(userError.message);
      }
      setUser(mapUser(data?.user ?? null));
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        throw signInError;
      }
    },
    [supabase]
  );

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      setError(null);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: name ? { data: { full_name: name } } : undefined,
      });
      if (signUpError) {
        setError(signUpError.message);
        throw signUpError;
      }
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.log('[OAuth Debug] NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      '[OAuth Debug] NEXT_PUBLIC_SUPABASE_ANON_KEY exists?',
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    console.log('[OAuth Debug] window.location.origin', window.location.origin);
    console.log('[OAuth Debug] redirectTo', redirectTo);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      console.log('[OAuth Debug] signInWithOAuth data', data);
      console.log('[OAuth Debug] signInWithOAuth error', oauthError);

      if (oauthError) {
        setError(oauthError.message);
        throw oauthError;
      }

      if (data?.url) {
        console.log('[OAuth Debug] authorize URL', data.url);
        window.location.assign(data.url);
        return;
      }

      console.warn('[OAuth Debug] No authorize URL returned from Supabase OAuth response');
    } catch (oauthError) {
      console.log('[OAuth Debug] signInWithOAuth catch error', oauthError);
      const message =
        oauthError instanceof Error ? oauthError.message : 'Google OAuth login failed';
      setError(message);
      throw oauthError;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      error,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, error, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
