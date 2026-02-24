'use client';

import { Suspense } from 'react';
import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/Toasts/toaster';

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '';

const paypalOptions: ReactPayPalScriptOptions = {
  clientId: paypalClientId,
  currency: 'USD',
  intent: 'capture',
  components: 'buttons'
};

export default function Providers({ children }: { children: React.ReactNode }) {
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
