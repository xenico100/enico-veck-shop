'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import Header from '../components/Header';
import MainContent from '../components/MainContent';
import { useAuth } from './context/AuthContext';
import VillageInterior from '@/components/VillageInterior';
import VillageStoryJournal from '@/components/VillageStoryJournal';
import { observeVillageViewport } from '@/utils/village-viewport';
import {
  findBuilding,
  VILLAGE_BUILDING_EVENT,
  VILLAGE_PAUSE_EVENT,
  type VillageBuildingId
} from '@/utils/village-buildings';

const SideMenu = dynamic(() => import('../components/SideMenu'));
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
const ServicesSectionModal = dynamic(
  () => import('../components/ServicesSectionModal'),
  {
    ssr: false
  }
);

type DatingHookDetail = {
  id?: string;
  label?: string;
};

type AuthHookDetail = {
  mode?: 'login' | 'signup';
};

export default function LandingPage() {
  useEffect(() => observeVillageViewport(window), []);
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
  const [servicesOpen, setServicesOpen] = useState(false);
  const [interior, setInterior] = useState<VillageBuildingId | null>(null);
  const [datingHookLabel, setDatingHookLabel] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const openCart = () => setCartOpen(true);
  const openMyPage = () => setMyPageOpen(true);
  const openMenu = () => {
    setHasOpenedMenu(true);
    setIsMenuOpen(true);
  };

  useEffect(() => {
    const arrival = findBuilding(
      new URLSearchParams(window.location.search).get('room')
    );
    if (arrival) setInterior(arrival.id);
    const enter = (event: Event) => {
      const building = findBuilding((event as CustomEvent).detail);
      if (!building) return;
      setInterior(building.id);
    };
    window.addEventListener(VILLAGE_BUILDING_EVENT, enter);
    return () => window.removeEventListener(VILLAGE_BUILDING_EVENT, enter);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(VILLAGE_PAUSE_EVENT, {
        detail: Boolean(
          interior ||
          authOpen ||
          myPageOpen ||
          cartOpen ||
          datingOpen ||
          servicesOpen ||
          isMenuOpen
        )
      })
    );
  }, [
    interior,
    authOpen,
    myPageOpen,
    cartOpen,
    datingOpen,
    servicesOpen,
    isMenuOpen
  ]);

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
    const handleCartHook = () => {
      setCartOpen(true);
    };

    window.addEventListener('cart:open-modal', handleCartHook);
    return () => window.removeEventListener('cart:open-modal', handleCartHook);
  }, []);

  useEffect(() => {
    const handleServicesHook = () => {
      setInterior('goods');
    };

    window.addEventListener('services:open-modal', handleServicesHook);
    return () =>
      window.removeEventListener('services:open-modal', handleServicesHook);
  }, []);

  useEffect(() => {
    const handleAuthHook = (event: Event) => {
      setInterior(null);
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
          onCommunityClick={() => setInterior('community')}
        />
      ) : null}

      <MainContent />
      <VillageStoryJournal />
      <VillageInterior
        building={interior}
        onClose={() => setInterior(null)}
        onProfile={() => {
          setInterior(null);
          openMyPage();
        }}
        onDating={() => {
          setInterior(null);
          setDatingOpen(true);
        }}
        onCart={() => {
          setInterior(null);
          openCart();
        }}
      />

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
      {servicesOpen ? (
        <ServicesSectionModal
          open={servicesOpen}
          onOpenCart={openCart}
          onOpenChange={setServicesOpen}
        />
      ) : null}
    </main>
  );
}
