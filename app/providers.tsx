'use client';

import { Suspense, useMemo } from 'react';
import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/Toasts/toaster';

type ProvidersProps = {
  children: React.ReactNode;
  paypalClientId?: string;
};

export default function Providers({ children, paypalClientId = '' }: ProvidersProps) {
  const paypalOptions = useMemo<ReactPayPalScriptOptions>(
    () => ({
      clientId: paypalClientId,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons'
    }),
    [paypalClientId]
  );

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <AuthProvider>
        <CartProvider>
          {children}
          <Suspense fallback={null}>
            <Toaster />
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </PayPalScriptProvider>
  );
}
