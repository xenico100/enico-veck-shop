'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import {
  findBuilding,
  VILLAGE_BUILDING_EVENT,
  VILLAGE_PAUSE_EVENT,
  type VillageBuildingId
} from '@/utils/village-buildings';

const VillageInterior = dynamic(() => import('@/components/VillageInterior'), {
  ssr: false
});
const AuthModal = dynamic(() => import('@/components/AuthModal'), {
  ssr: false
});
const MyPageModal = dynamic(() => import('@/components/MyPageModal'), {
  ssr: false
});
const CartModal = dynamic(() => import('@/components/CartModal'), {
  ssr: false
});
const DatingModal = dynamic(() => import('@/components/DatingModal'), {
  ssr: false
});

type Modal = 'auth' | 'profile' | 'cart' | 'dating';
type AuthMode = 'login' | 'signup';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** Existing village services, without mounting the 2D movement or presence scene. */
export default function WorldVillageAdapter({
  onPauseChange
}: {
  onPauseChange?: (paused: boolean) => void;
}) {
  const [interior, setInterior] = useState<VillageBuildingId | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [datingHookLabel, setDatingHookLabel] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const paused = Boolean(interior || modal);

  useEffect(() => {
    const enter = (event: Event) => {
      const building = findBuilding((event as CustomEvent<unknown>).detail);
      if (!building) return;
      setModal(null);
      setInterior(building.id);
    };
    const auth = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: unknown } | undefined>)
        .detail;
      setInterior(null);
      setAuthMode(detail?.mode === 'signup' ? 'signup' : 'login');
      setAuthError(null);
      setModal('auth');
    };
    const cart = () => {
      setInterior(null);
      setModal('cart');
    };
    const dating = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: unknown } | undefined>)
        .detail;
      setDatingHookLabel(
        typeof detail?.label === 'string' && detail.label.trim()
          ? detail.label.trim()
          : null
      );
      setInterior(null);
      setModal('dating');
    };
    const services = () => {
      setModal(null);
      setInterior('goods');
    };

    window.addEventListener(VILLAGE_BUILDING_EVENT, enter);
    window.addEventListener('auth:open-modal', auth);
    window.addEventListener('cart:open-modal', cart);
    window.addEventListener('dating:open-modal', dating);
    window.addEventListener('services:open-modal', services);
    return () => {
      window.removeEventListener(VILLAGE_BUILDING_EVENT, enter);
      window.removeEventListener('auth:open-modal', auth);
      window.removeEventListener('cart:open-modal', cart);
      window.removeEventListener('dating:open-modal', dating);
      window.removeEventListener('services:open-modal', services);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(VILLAGE_PAUSE_EVENT, { detail: paused })
    );
    onPauseChange?.(paused);
  }, [paused, onPauseChange]);

  useEffect(
    () => () => {
      window.dispatchEvent(
        new CustomEvent(VILLAGE_PAUSE_EVENT, { detail: false })
      );
    },
    []
  );

  const openModal = (next: Modal) => {
    setInterior(null);
    if (next === 'dating') setDatingHookLabel(null);
    setModal(next);
  };
  const closeModal = (current: Modal) => {
    setModal((open) => (open === current ? null : open));
  };

  return (
    <>
      {interior && (
        <VillageInterior
          building={interior}
          onClose={() => setInterior(null)}
          onCart={() => openModal('cart')}
          onProfile={() => openModal('profile')}
          onDating={() => openModal('dating')}
        />
      )}
      {modal === 'auth' && (
        <AuthModal
          open
          mode={authMode}
          onClose={() => closeModal('auth')}
          onSwitchMode={(mode) => {
            setAuthMode(mode);
            setAuthError(null);
          }}
          loading={authLoading}
          error={authError}
          onLogin={async (email, password) => {
            setAuthLoading(true);
            setAuthError(null);
            try {
              await signInWithEmail(email, password);
              closeModal('auth');
            } catch (error: unknown) {
              setAuthError(errorMessage(error, '로그인 실패'));
            } finally {
              setAuthLoading(false);
            }
          }}
          onSignup={async (name, email, password) => {
            setAuthLoading(true);
            setAuthError(null);
            try {
              await signUpWithEmail(name, email, password);
              closeModal('auth');
            } catch (error: unknown) {
              setAuthError(errorMessage(error, '회원가입 실패'));
            } finally {
              setAuthLoading(false);
            }
          }}
          onGoogle={() => {
            setAuthLoading(true);
            setAuthError(null);
            signInWithGoogle().catch((error: unknown) => {
              setAuthError(errorMessage(error, 'Google 로그인 실패'));
              setAuthLoading(false);
            });
          }}
        />
      )}
      {modal === 'profile' && (
        <MyPageModal
          open
          onOpenChange={(open) => !open && closeModal('profile')}
        />
      )}
      {modal === 'cart' && (
        <CartModal open onOpenChange={(open) => !open && closeModal('cart')} />
      )}
      {modal === 'dating' && (
        <DatingModal
          open
          hookLabel={datingHookLabel}
          onOpenChange={(open) => {
            if (!open) {
              setDatingHookLabel(null);
              closeModal('dating');
            }
          }}
        />
      )}
    </>
  );
}
