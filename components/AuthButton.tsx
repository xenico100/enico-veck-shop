// components/AuthButton.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// props로 온 클릭 이벤트를 받아서 실행하게 함
export default function AuthButton({ onMyPageClick }: { onMyPageClick?: () => void }) {
  const [user, setUser] = useState<any>(null);
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createClient() : null),
    [isSupabaseConfigured]
  );
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignIn = () => router.push('/login');
  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      {!supabase ? (
        <button
          disabled
          className="rounded-full border border-white/10 bg-neutral-800 px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400"
        >
          LOGIN
        </button>
      ) : user ? (
        <>
          <p className="text-xs text-neutral-400">{user.email}님</p>
          <div className="flex gap-3">
            <button
              onClick={onMyPageClick ?? (() => router.push('/account'))}
              className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60"
            >
              MY PAGE
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 transition hover:border-white/60 hover:text-white"
            >
              LOGOUT
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="rounded-full border border-white/30 bg-white/10 px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/60 hover:bg-white/20"
        >
          LOGIN
        </button>
      )}
    </div>
  );
}
