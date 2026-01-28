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
  const handleMyPage = () =>
    onMyPageClick ? onMyPageClick() : router.push('/mypage');
  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {!supabase ? (
        <button
          disabled
          className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/40"
        >
          LOGIN
        </button>
      ) : user ? (
        <>
          <p className="text-xs tracking-[0.2em] text-white/50">
            {user.email}님
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMyPage}
              className="border border-white/30 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white hover:text-white/80"
            >
              My Page
            </button>
            <button
              onClick={handleSignOut}
              className="border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:border-white hover:text-white"
            >
              Logout
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="border border-white/50 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white hover:text-white/80"
        >
          LOGIN
        </button>
      )}
    </div>
  );
}
