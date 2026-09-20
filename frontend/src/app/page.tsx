'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, LogOut, ArrowRight, Sparkles, Mic, Square } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Session } from '@supabase/supabase-js';

import { supabase, ensureProfile } from '@/lib/supabase';
import { runAgent, warmBackend, type AgentResponse } from '@/lib/api';
import { useSpeech } from '@/lib/speech';
import { formatCurrency } from '@/lib/utils';
import ShutterHero from '@/components/ShutterHero';
import ExecutionTimeline from '@/components/ExecutionTimeline';
import LowStockBanner from '@/components/LowStockBanner';
import GoogleMark from '@/components/GoogleMark';

/* Exponential ease-out from an already-visible default. */
const enter = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };
const spring = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 };

const EXAMPLES = [
  'Bhaiya 2 Maggi, 1 Amul Taaza milk aur 1 Britannia bread de do',
  '10 Britannia bread chahiye',
  'mujhe milk chahiye',
];

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Judges evaluating unattended should not have to hand over a Google
  // account before they can see the product work.
  const [guest, setGuest] = useState(false);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);

  // The backend sleeps on a free tier and takes ~50s to wake. Ping it while the
  // visitor is still reading the hero, so the first order never waits on a cold
  // start. Fire-and-forget: a failure here must not affect the page.
  useEffect(() => {
    warmBackend();
  }, []);

  useEffect(() => {
    // Safety net: if Supabase's redirect allow-list rejects our redirectTo it
    // silently falls back to the Site URL, dropping the user on "/" with the
    // code still in the query. Handle it here so sign-in completes anyway.
    const url = new URL(window.location.href);
    const strayCode = url.searchParams.get('code');

    if (strayCode) {
      supabase.auth
        .exchangeCodeForSession(strayCode)
        .then(({ data, error }) => {
          if (error) throw error;
          setSession(data.session);
          if (data.session) fetchProfile(data.session.user.id);
          else setAuthLoading(false);
        })
        .catch((e) => {
          console.error('[auth] stray code exchange failed:', e?.message);
          setAuthLoading(false);
        })
        .finally(() => {
          // Strip the code so a refresh cannot replay it.
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchProfile(session.user.id);
        else setAuthLoading(false);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await ensureProfile(user).catch(() => {});
          setProfile({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          });
        }
      }
    } catch (err) {
      console.error('[auth] profile load failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Must be listed in Supabase → Authentication → URL Configuration →
        // Redirect URLs, or Supabase silently falls back to the Site URL.
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) console.error('[auth] signInWithOAuth failed:', error.message);
  };

  const handleLogout = async () => {
    if (guest) {
      setGuest(false);
      return;
    }
    await supabase.auth.signOut();
  };

  const speech = useSpeech((text) => setMessage(text));

  const submit = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await runAgent(text.trim());
      setResult(response);
      if (response.success) setMessage('');
    } catch (error: any) {
      setResult({
        success: false,
        response: error.message || 'Could not reach the store operator.',
        events: [{ type: 'workflow_failed', message: error.message }],
        requestId: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────── loading ───────────────────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface grid place-items-center">
        <Loader2 className="w-7 h-7 text-ink-400 animate-spin" />
      </div>
    );
  }

  /* ───────────────────────── signed out ────────────────────── */
  if (!session && !guest) {
    return (
      <div className="min-h-screen bg-surface">
        <ShutterHero frameCount={72} poster="/hero-poster.jpg" />

        <div className="relative z-10 -mt-[38vh] flex justify-center px-5 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={enter}
            className="w-full max-w-[26rem] bg-surface-raised rounded-panel shadow-e3 p-9 text-center"
          >
            <Image
              src="/logo.png"
              alt="DukaanPilot"
              width={168}
              height={168}
              priority
              className="mx-auto mb-6 h-[4.5rem] w-auto"
            />

            <h2 className="font-display text-[1.75rem] leading-tight font-bold text-ink-900">
              Open your dukaan
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
              Sign in to take orders, check live stock and let the operator run the
              counter for you.
            </p>

            <button
              onClick={handleGoogleLogin}
              className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-control border border-line-strong bg-surface-raised px-6 py-3.5 text-[0.9375rem] font-semibold text-ink-800 transition-colors hover:bg-surface-sunken active:bg-ink-100"
            >
              <GoogleMark className="w-5 h-5" />
              Continue with Google
            </button>

            <button
              onClick={() => {
                setGuest(true);
                setAuthLoading(false);
              }}
              className="mt-3 w-full rounded-control px-6 py-3 text-[0.9375rem] font-semibold text-ink-600 transition-colors hover:bg-surface-sunken hover:text-ink-900"
            >
              Or try the live demo store →
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── dashboard ─────────────────────── */
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <div className="flex h-[68px] items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/mark.png"
                alt=""
                width={36}
                height={36}
                priority
                className="h-9 w-9 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="font-display text-[0.9375rem] font-bold leading-tight text-ink-900 truncate">
                  DukaanPilot
                </p>
                <p className="text-[0.75rem] leading-tight text-ink-500 truncate">
                  {guest
                    ? 'Demo store · shared'
                    : profile?.name
                      ? `${profile.name}'s store`
                      : 'Store operator'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/orders"
                className="rounded-control px-3 py-2 text-[0.875rem] font-medium text-ink-600 transition-colors hover:bg-surface-sunken hover:text-ink-900"
              >
                Orders
              </Link>
              <Link
                href="/inventory"
                className="rounded-control px-3 py-2 text-[0.875rem] font-medium text-ink-600 transition-colors hover:bg-surface-sunken hover:text-ink-900"
              >
                Inventory
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="ml-1 rounded-control p-2 text-ink-500 transition-colors hover:bg-surface-sunken hover:text-ink-900"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
          <div className="h-px bg-line" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-44 pt-10 sm:px-6">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={enter}
              className="pt-10"
            >
              {guest && (
                <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-brand-50 px-4 py-3">
                  <p className="text-[0.875rem] font-medium text-brand-800">
                    You&apos;re on the shared demo store — orders here are real.
                  </p>
                  <button
                    onClick={handleGoogleLogin}
                    className="text-[0.875rem] font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Sign in for your own store
                  </button>
                </div>
              )}

              <h1 className="font-display text-[2.125rem] sm:text-[2.5rem] leading-[1.08] font-bold text-ink-900">
                Operator standing by.
              </h1>
              <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-600">
                Type a customer&apos;s request in Hindi, Hinglish or English. I&apos;ll
                resolve the products against live stock, price them, create the order
                and update inventory.
              </p>

              <div className="mt-10">
                <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
                  Try one
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => submit(ex)}
                      disabled={loading}
                      className="group flex items-center gap-3 rounded-card bg-surface-raised px-4 py-3.5 text-left shadow-e1 transition-all hover:shadow-e2 hover:-translate-y-px disabled:opacity-50 disabled:translate-y-0"
                    >
                      <Sparkles className="w-4 h-4 shrink-0 text-brand-500" />
                      <span className="text-[0.9375rem] font-medium text-ink-800">{ex}</span>
                      <ArrowRight className="ml-auto w-4 h-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={result.requestId}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={enter}
              className="space-y-3"
            >
              <ExecutionTimeline result={result} />

              {result.success && result.order ? (
                <OrderReceipt result={result} />
              ) : result.success ? (
                <div className="rounded-card bg-warn-50 px-6 py-5">
                  <p className="agent-copy text-[0.9375rem] leading-relaxed font-medium text-warn-700">
                    {result.response}
                  </p>
                </div>
              ) : (
                <div className="rounded-card bg-danger-50 px-6 py-5">
                  <p className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-danger-700">
                    Operation refused
                  </p>
                  <p className="agent-copy mt-2 text-[0.9375rem] leading-relaxed font-medium text-danger-700">
                    {result.response}
                  </p>
                </div>
              )}

              {result.lowStockAlerts && result.lowStockAlerts.length > 0 && (
                <LowStockBanner alerts={result.lowStockAlerts} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input dock — the primary control, always within thumb reach. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-surface via-surface/90 to-transparent px-4 pb-5 pt-10">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence>
            {speech.error && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="pointer-events-auto mb-2 rounded-control bg-danger-50 px-4 py-2 text-[0.8125rem] font-medium text-danger-700"
              >
                {speech.error}
              </motion.p>
            )}
            {speech.listening && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="pointer-events-auto mb-2 flex items-center gap-2.5 rounded-control bg-surface-inverse px-4 py-2.5"
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-white">
                  {speech.interim || 'Listening… bolhiye'}
                </span>
                <button
                  type="button"
                  onClick={() => speech.setLang(speech.lang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                  className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/25"
                >
                  {speech.lang === 'en-IN' ? 'Hinglish' : 'हिंदी'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={spring}
            onSubmit={(e) => {
              e.preventDefault();
              submit(message);
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-panel bg-surface-raised p-2 shadow-e3"
          >
            <input
              type="text"
              value={speech.listening && speech.interim ? speech.interim : message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="2 Maggi, 1 Amul milk aur bread de do…"
              disabled={loading}
              aria-label="Customer request"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[1rem] font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none disabled:opacity-50"
            />

            {speech.supported && (
              <button
                type="button"
                onClick={speech.toggle}
                disabled={loading}
                aria-label={speech.listening ? 'Stop recording' : 'Speak the order'}
                aria-pressed={speech.listening}
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-control transition-all active:scale-95 disabled:opacity-40 ${
                  speech.listening
                    ? 'bg-danger-500 text-white'
                    : 'bg-surface-sunken text-ink-700 hover:bg-ink-200 hover:text-ink-900'
                }`}
              >
                {speech.listening && (
                  <span className="absolute inset-0 animate-ping rounded-control bg-danger-500 opacity-40" />
                )}
                {speech.listening ? (
                  <Square className="relative h-4 w-4 fill-current" strokeWidth={0} />
                ) : (
                  <Mic className="relative h-[18px] w-[18px]" strokeWidth={2.2} />
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Send request"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-brand-500 text-white shadow-brand transition-all hover:bg-brand-600 active:scale-95 disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-[18px] w-[18px]" strokeWidth={2.2} />
              )}
            </button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}

/* The receipt is the payoff — it must read as a document, not a hero metric. */
function OrderReceipt({ result }: { result: AgentResponse }) {
  const order = result.order!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...enter, delay: 0.08 }}
      className="overflow-hidden rounded-card bg-surface-inverse"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 pt-6">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-success-200">
            Order confirmed
          </p>
          <p
            className="tnum font-display mt-1 text-[1.5rem] font-bold leading-none text-white"
            data-numeric
          >
            #{String(order.order_id).slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.75rem] text-ink-400">Total</p>
          <p className="tnum font-display text-[2rem] font-bold leading-none text-white" data-numeric>
            {formatCurrency(Number(order.total))}
          </p>
        </div>
      </div>

      <p className="agent-copy mt-5 border-t border-white/10 px-6 py-5 text-[0.9375rem] leading-relaxed text-ink-300">
        {result.response}
      </p>
    </motion.div>
  );
}
