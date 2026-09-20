'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Send, Loader2, CheckCircle2, XCircle, Package, ShoppingCart, Archive, LogOut, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { runAgent, type AgentResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Session } from '@supabase/supabase-js';

// Premium spring Physics (Emil Kowalski style)
const springyTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

const subtleTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 40
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);

  // Authentication Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setAuthLoading(false);
    });

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
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await runAgent(message.trim());
      setResult(response);
      if (response.success) {
        setMessage('');
      }
    } catch (error: any) {
      setResult({
        success: false,
        response: error.message || 'Failed to process request',
        events: [{ type: 'workflow_failed', message: error.message }],
        requestId: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN SCREEN ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springyTransition}
          className="bg-white p-10 py-12 rounded-[2rem] shadow-smooth-lg max-w-md w-full border border-slate-100 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springyTransition, delay: 0.1 }}
            className="w-20 h-20 bg-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-8 rotate-3"
          >
            <Package className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            DukaanPilot
          </h1>
          <p className="text-slate-500 mb-10 leading-relaxed">
            Your Kirana's fully autonomous AI store operator. Sign in to access your dashboard.
          </p>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-sm hover:border-slate-300 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Impeccable Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-400 flex items-center justify-center shadow-md shadow-orange-500/20"
              >
                <Package className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">DukaanPilot</h1>
                <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
                  {profile?.name ? `${profile.name}'s Store` : 'Store Operator'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/orders"
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all"
                >
                  Orders
                </Link>
                <Link
                  href="/inventory"
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all"
                >
                  Inventory
                </Link>
              </nav>

              <div className="h-6 w-px bg-slate-200 hidden md:block" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area via 21st.dev principles (narrower column for optimal reading) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-40 flex flex-col items-center">

        <AnimatePresence mode="wait">
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={springyTransition}
              className="mt-20 text-center w-full max-w-2xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springyTransition, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200/60 shadow-sm text-xs font-bold mb-8 uppercase tracking-widest"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                System Active
              </motion.div>

              <h2 className="text-[2.75rem] leading-[1.1] font-black text-slate-900 mb-6 tracking-tight">
                Operator standing by.
              </h2>
              <p className="text-[1.1rem] text-slate-500 leading-relaxed font-medium">
                I can process orders, check stock, and manage your inventory autonomously. Detail the customer's request below.
              </p>
            </motion.div>
          )}

          {result && (
            <motion.div
              key={result.requestId}
              initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={springyTransition}
              className="w-full space-y-4"
            >
              <LayoutGroup>
                {/* Audit Log Card */}
                <motion.div layout className="bg-white rounded-[1.5rem] border border-slate-200/60 p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Execution Log</h3>
                  <div className="space-y-4">
                    {result.events.map((event, idx) => (
                      <motion.div
                        key={idx}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...springyTransition, delay: idx * 0.08 }}
                        className="flex items-start gap-4"
                      >
                        <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="text-[15px] font-medium text-slate-700">{event.message}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Status Card */}
                <motion.div layout>
                  {result.success && result.order ? (
                    <div className="bg-slate-900 rounded-[1.5rem] p-8 mt-4 text-white shadow-xl flex flex-col sm:flex-row justify-between gap-8 relative overflow-hidden">
                      {/* Decorative gradient blur */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />

                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingCart className="w-4 h-4 text-orange-400" />
                          <p className="text-sm font-semibold text-orange-400 tracking-wide uppercase">Order Confirmed</p>
                        </div>
                        <h3 className="text-3xl font-black">#{result.order.order_id.slice(0, 8).toUpperCase()}</h3>
                        <p className="text-slate-400 font-medium mt-4 max-w-sm leading-relaxed text-sm">
                          {result.response}
                        </p>
                      </div>
                      <div className="relative z-10 sm:text-right flex flex-col justify-end">
                        <p className="text-sm text-slate-400 font-medium mb-1">Total Amount</p>
                        <p className="text-[2.5rem] leading-none font-black text-white">
                          {formatCurrency(result.order.total)}
                        </p>
                      </div>
                    </div>
                  ) : result.success ? (
                    <div className="bg-white rounded-[1.5rem] border border-slate-200/60 p-8 mt-4 shadow-sm">
                      <p className="text-lg font-medium text-slate-800 leading-relaxed">
                        {result.response}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 rounded-[1.5rem] border border-red-100 p-8 mt-4 shadow-sm flex gap-4">
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <div>
                        <h3 className="text-base font-bold text-red-900 mb-2">Operation Blocked</h3>
                        <p className="text-[15px] font-medium text-red-800/80 leading-relaxed">{result.response}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Input Area (Mac OS style dock positioning) */}
      <div className="fixed bottom-8 left-0 right-0 z-50 px-4 pointer-events-none">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springyTransition}
          className="max-w-3xl mx-auto pointer-events-auto"
        >
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 p-2 bg-white/60 backdrop-blur-2xl border border-slate-200/80 rounded-[2rem] shadow-smooth-lg hover:shadow-xl transition-shadow"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Type "2 Maggi, 1 Amul milk aur bread de do"...'
              disabled={loading}
              className="flex-1 px-6 py-4 bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50 text-[16px] font-medium"
            />
            <motion.button
              type="submit"
              disabled={loading || !message.trim()}
              whileHover={{ scale: loading || !message.trim() ? 1 : 1.02 }}
              whileTap={{ scale: loading || !message.trim() ? 1 : 0.96 }}
              className="px-6 py-4 bg-slate-900 text-white font-bold rounded-full disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
