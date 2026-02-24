'use client';

import { Suspense } from 'react';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/Toasts/toaster';

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      </CartProvider>
    </AuthProvider>
  );
}
