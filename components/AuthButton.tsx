// components/AuthButton.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// props로 온 클릭 이벤트를 받아서 실행하게 함
export default function AuthButton({ onMyPageClick }: { onMyPageClick?: () => void }) {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = () => router.push('/login');
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
      {user ? (
        <>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>{user.email}님</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* 내 정보 버튼 추가 */}
            <button
              onClick={onMyPageClick}
              style={{ padding: '8px 15px', border: '1px solid #fff', background: 'transparent', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
            >
              MY PAGE
            </button>
            <button
              onClick={handleSignOut}
              style={{ padding: '8px 15px', border: '1px solid #cc005f', background: 'transparent', color: '#cc005f', fontSize: '12px', cursor: 'pointer' }}
            >
              LOGOUT
            </button>
          </div>
        </>
      ) : (
        <button onClick={handleSignIn} style={{ padding: '12px 30px', background: '#cc005f', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          LOGIN
        </button>
      )}
    </div>
  );
}