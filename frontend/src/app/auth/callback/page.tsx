'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase, ensureProfile } from '@/lib/supabase';

/**
 * OAuth landing page.
 *
 * Supabase sends the browser here with `?code=...` (PKCE). We exchange it for a
 * session explicitly rather than relying on detectSessionInUrl, which races with
 * the first getSession() call on the home page and is the usual cause of
 * "signed in but still on the login screen".
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errDesc = url.searchParams.get('error_description') ?? url.searchParams.get('error');

      if (errDesc) {
        if (!cancelled) setError(errDesc);
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash.includes('access_token')) {
          // Implicit-flow fallback: let the SDK parse the hash.
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) await ensureProfile(user).catch(() => {});

        if (!cancelled) {
          // Strip the code from the URL so a refresh can't replay it.
          router.replace('/');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Sign-in failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-5">
        <div className="w-full max-w-md rounded-card bg-surface-raised p-8 text-center shadow-e2">
          <AlertTriangle className="mx-auto mb-4 h-9 w-9 text-warn-500" strokeWidth={2} />
          <h1 className="font-display text-[1.25rem] font-bold text-ink-900">Sign-in failed</h1>
          <p className="mt-2 break-words text-[0.9375rem] leading-relaxed text-ink-600">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="mt-7 rounded-control bg-brand-500 px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <Loader2 className="h-7 w-7 animate-spin text-ink-400" />
      <p className="text-[0.9375rem] text-ink-500">Signing you in…</p>
    </div>
  );
}
