'use client';

import { Suspense, useState } from 'react';
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
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center text-sm text-cyan-50/70 sm:px-6 lg:px-8">
        Studio 콘텐츠를 불러오는 중...
      </div>
    )
  }
);
const CommunityBoard = dynamic(() => import('../components/CommunityBoard'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-12 text-center text-sm text-cyan-50/70 sm:px-6 lg:px-8">
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
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const openCart = () => setCartOpen(true);
  const openMyPage = () => setMyPageOpen(true);
  const openMenu = () => {
    setHasOpenedMenu(true);
    setIsMenuOpen(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <span className="ambient-orb left-[-8rem] top-[10vh] h-72 w-72 bg-[radial-gradient(circle,rgba(129,232,255,0.4)_0%,rgba(129,232,255,0)_72%)]" />
        <span className="ambient-orb right-[-6rem] top-[34vh] h-80 w-80 bg-[radial-gradient(circle,rgba(255,182,92,0.26)_0%,rgba(255,182,92,0)_72%)] [animation-delay:1.8s]" />
        <span className="ambient-orb bottom-[-10rem] left-[30vw] h-96 w-96 bg-[radial-gradient(circle,rgba(92,209,255,0.2)_0%,rgba(92,209,255,0)_72%)] [animation-delay:3.4s]" />
      </div>

      <Header onMenuClick={openMenu} />

      {hasOpenedMenu ? (
        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onCartClick={openCart}
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
    </main>
  );
}
