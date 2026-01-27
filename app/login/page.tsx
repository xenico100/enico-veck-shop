'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // 🔥 구글 로그인 함수 (이게 핵심)
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`, // 로그인 끝나면 돌아올 주소
      },
    });

    if (error) {
      alert('구글 로그인 에러: ' + error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('가입 실패: ' + error.message);
      else {
        alert('회원가입 성공! 🎉');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('로그인 실패: ' + error.message);
      else {
        router.push('/');
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white' }}>
      <div style={{ width: '100%', maxWidth: '350px', padding: '20px', display:'flex', flexDirection:'column', gap:'20px' }}>
        
        <div style={{textAlign:'center', marginBottom: '10px'}}>
             <h1 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing:'2px'}}>
               {isSignUp ? 'JOIN US' : 'LOGIN'}
             </h1>
             <p style={{fontSize: '12px', color: '#666'}}>ZEUS STUDIO MEMBER</p>
        </div>

        {/* 🔥 구글 로그인 버튼 추가 */}
        <button 
          onClick={handleGoogleLogin}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '12px', background: 'white', color: 'black', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
          }}
        >
          {/* 구글 G 로고 SVG */}
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Google로 계속하기
        </button>

        <div style={{display:'flex', alignItems:'center', gap:'10px', color:'#333'}}>
            <div style={{height:'1px', background:'#333', flex:1}}></div>
            <span style={{fontSize:'12px'}}>OR</span>
            <div style={{height:'1px', background:'#333', flex:1}}></div>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required
            style={{ padding: '15px', background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: '4px', outline: 'none' }} 
          />
          <input 
            type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required
            style={{ padding: '15px', background: '#1a1a1a', border: '1px solid #333', color: 'white', borderRadius: '4px', outline: 'none' }} 
          />
          
          <button 
            type="submit" disabled={loading}
            style={{ padding: '15px', background: '#cc005f', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            {loading ? '처리 중...' : (isSignUp ? '이메일로 회원가입' : '이메일로 로그인')}
          </button>
        </form>

        <p style={{textAlign: 'center', fontSize: '13px', color: '#888'}}>
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'} 
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </span>
        </p>

        <button type="button" onClick={() => router.push('/')} style={{background:'none', border:'none', color:'#444', fontSize:'12px', cursor:'pointer'}}>
            ← 메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}