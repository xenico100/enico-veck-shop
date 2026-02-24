'use client';

import { Suspense } from 'react';
import { PayPalScriptProvider, type ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from '@/components/ui/Toasts/toaster';

const paypalOptions: ReactPayPalScriptOptions = {
  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test',
  currency: 'USD',
  intent: 'capture'
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
