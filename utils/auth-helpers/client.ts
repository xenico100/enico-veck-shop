'use client';

import { createClient } from '@/utils/supabase/client';
import { type Provider } from '@supabase/supabase-js';
import { redirectToPath } from './server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export async function handleRequest(
  e: React.FormEvent<HTMLFormElement>,
  requestFunc: (formData: FormData) => Promise<string>,
  router: AppRouterInstance | null = null
): Promise<boolean | void> {
  // Prevent default form submission refresh
  e.preventDefault();

  const formData = new FormData(e.currentTarget);
  const redirectUrl: string = await requestFunc(formData);

  if (router) {
    // If client-side router is provided, use it to redirect
    return router.push(redirectUrl);
  } else {
    // Otherwise, redirect server-side
    return await redirectToPath(redirectUrl);
  }
}

export async function signInWithOAuth(e: React.FormEvent<HTMLFormElement>) {
  // Prevent default form submission refresh
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const provider = String(formData.get('provider')).trim() as Provider;

  // Create client-side supabase client and call signInWithOAuth
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;
  console.log('[OAuth Debug] NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    '[OAuth Debug] NEXT_PUBLIC_SUPABASE_ANON_KEY exists?',
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  console.log('[OAuth Debug] window.location.origin', window.location.origin);
  console.log('[OAuth Debug] redirectTo', redirectTo);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });

    console.log('[OAuth Debug] signInWithOAuth data', data);
    console.log('[OAuth Debug] signInWithOAuth error', error);

    if (error) {
      throw error;
    }

    if (data?.url) {
      console.log('[OAuth Debug] authorize URL', data.url);
      window.location.assign(data.url);
      return;
    }

    console.warn('[OAuth Debug] No authorize URL returned from Supabase OAuth response');
  } catch (error) {
    console.log('[OAuth Debug] signInWithOAuth catch error', error);
    throw error;
  }
}
