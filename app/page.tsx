'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import Header from '../components/Header';
import MainContent from '../components/MainContent';
import AboutSection from '../components/AboutSection';
import { useAuth } from './context/AuthContext';

const SideMenu = dynamic(() => import('../components/SideMenu'));
const ServicesSection = dynamic(() => import('../components/ServicesSection'));
const StudioSectionWithSearchParams = dynamic(
  () => import('../components/StudioSectionWithSearchParams'),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center text-sm text-stone-600 sm:px-6 lg:px-8">
        Studio 콘텐츠를 불러오는 중...
      </div>
    )
  }
);
const CommunityBoard = dynamic(() => import('../components/CommunityBoard'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-12 text-center text-sm text-stone-600 sm:px-6 lg:px-8">
      커뮤니티를 불러오는 중...
    </div>
  )
});
const Footer = dynamic(() => import('../components/Footer'));
const AuthModal = dynamic(() => import('../components/AuthModal'), {
  ssr: false
});
const MyPageModal = dynamic(() => import('../components/MyPageModal'), {
  ssr: false
});
const CartModal = dynamic(() => import('../components/CartModal'), {
  ssr: false
});
const DatingModal = dynamic(() => import('../components/DatingModal'), {
  ssr: false
});

type DatingHookDetail = {
  id?: string;
  label?: string;
};

type AuthHookDetail = {
  mode?: 'login' | 'signup';
};

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);

  // ✅ Auth modal state (서비스 팝업이랑 같은 패턴)
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [datingOpen, setDatingOpen] = useState(false);
  const [datingHookLabel, setDatingHookLabel] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const openCart = () => setCartOpen(true);
  const openMyPage = () => setMyPageOpen(true);
  const openMenu = () => {
    setHasOpenedMenu(true);
    setIsMenuOpen(true);
  };

  useEffect(() => {
    const handleDatingHook = (event: Event) => {
      const detail = (event as CustomEvent<DatingHookDetail>).detail;
      setDatingHookLabel(
        typeof detail?.label === 'string' && detail.label.trim()
          ? detail.label.trim()
          : null
      );
      setDatingOpen(true);
    };

    window.addEventListener('dating:open-modal', handleDatingHook);
    return () =>
      window.removeEventListener('dating:open-modal', handleDatingHook);
  }, []);

  useEffect(() => {
    const handleAuthHook = (event: Event) => {
      const detail = (event as CustomEvent<AuthHookDetail>).detail;
      setAuthMode(detail?.mode === 'signup' ? 'signup' : 'login');
      setAuthError(null);
      setAuthOpen(true);
    };

    window.addEventListener('auth:open-modal', handleAuthHook);
    return () => window.removeEventListener('auth:open-modal', handleAuthHook);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden text-white">
      <Header onMenuClick={openMenu} />

      {hasOpenedMenu ? (
        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onCartClick={openCart}
          onDatingClick={() => {
            setDatingHookLabel(null);
            setDatingOpen(true);
          }}
          onLoginClick={() => {
            setAuthMode('login');
            setAuthError(null);
            setAuthOpen(true);
          }}
          onMyPageClick={openMyPage}
        />
      ) : null}

      <MainContent />
      <AboutSection />
      <ServicesSection onOpenCart={openCart} />
      <div className="relative">
        <Suspense fallback={<div>Loading...</div>}>
          <StudioSectionWithSearchParams />
        </Suspense>
      </div>

      <section id="community" className="section-shell pb-24 pt-8 md:pt-14">
        <div className="tech-panel scanline animate-rise p-4 sm:p-6 md:p-8">
          <CommunityBoard />
        </div>
      </section>

      <Footer />

      {/* ✅ 로그인 / 회원가입 모달 (서비스 팝업과 동일한 방식) */}
      {authOpen ? (
        <AuthModal
          open={authOpen}
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSwitchMode={(mode) => {
            setAuthMode(mode);
            setAuthError(null);
          }}
          loading={authLoading}
          error={authError}
          onLogin={async (email, password) => {
            try {
              setAuthLoading(true);
              setAuthError(null);
              await signInWithEmail(email, password);
              setAuthOpen(false);
            } catch (e: any) {
              setAuthError(e?.message ?? '로그인 실패');
            } finally {
              setAuthLoading(false);
            }
          }}
          onSignup={async (name, email, password) => {
            try {
              setAuthLoading(true);
              setAuthError(null);
              await signUpWithEmail(name, email, password);
              setAuthOpen(false);
            } catch (e: any) {
              setAuthError(e?.message ?? '회원가입 실패');
            } finally {
              setAuthLoading(false);
            }
          }}
          onGoogle={() => {
            setAuthError(null);
            setAuthLoading(true);
            signInWithGoogle().catch((e: any) => {
              setAuthError(e?.message ?? 'Google 로그인 실패');
              setAuthLoading(false);
            });
          }}
        />
      ) : null}

      {myPageOpen ? (
        <MyPageModal open={myPageOpen} onOpenChange={setMyPageOpen} />
      ) : null}
      {cartOpen ? (
        <CartModal open={cartOpen} onOpenChange={setCartOpen} />
      ) : null}
      {datingOpen ? (
        <DatingModal
          open={datingOpen}
          hookLabel={datingHookLabel}
          onOpenChange={(nextOpen) => {
            setDatingOpen(nextOpen);
            if (!nextOpen) {
              setDatingHookLabel(null);
            }
          }}
        />
      ) : null}
    </main>
  );
}
