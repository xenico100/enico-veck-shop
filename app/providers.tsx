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
  const resolvedPayPalClientId = useMemo(
    () => (paypalClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim(),
    [paypalClientId]
  );

  const paypalOptions = useMemo<ReactPayPalScriptOptions>(
    () => ({
      clientId: resolvedPayPalClientId,
      'client-id': resolvedPayPalClientId,
      currency: 'USD',
      intent: 'capture',
      components: 'buttons'
    }),
    [resolvedPayPalClientId]
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
