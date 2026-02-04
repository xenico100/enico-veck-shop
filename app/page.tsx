'use client';

import { useState } from 'react';

import Header from '../components/Header';
import SideMenu from '../components/SideMenu';
import MainContent from '../components/MainContent';
import AboutSection from '../components/AboutSection';
import ServicesSection from '../components/ServicesSection';
import StudioSection from '../components/StudioSection';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import MyPageModal from '../components/MyPageModal';
import { useAuth } from './context/AuthContext';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ✅ Auth modal state (서비스 팝업이랑 같은 패턴)
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  // 임시 핸들러 (나중에 실제 모달/기능으로 교체)
  const openCart = () => alert('TODO: Cart modal');
  const openMyPage = () => setMyPageOpen(true);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Header onMenuClick={() => setIsMenuOpen(true)} />

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

      <div id="home"><MainContent /></div>
      <div id="about"><AboutSection /></div>
      <div id="services"><ServicesSection /></div>
      <div id="studio"><StudioSection /></div>

      <Footer />

      {/* ✅ 로그인 / 회원가입 모달 (서비스 팝업과 동일한 방식) */}
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

      <MyPageModal open={myPageOpen} onOpenChange={setMyPageOpen} />
    </main>
  );
}
