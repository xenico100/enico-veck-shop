'use client';

import { Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/Toasts/toaster';

export default function Providers({ children }: { children: React.ReactNode }) {
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
