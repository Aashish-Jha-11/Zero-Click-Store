'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle2, XCircle, Package, ShoppingCart, Archive, Sparkles, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { runAgent, type AgentResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [showHero, setShowHero] = useState(true);

  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const videoProgress = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 0.8], [1, 0.8, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 1.1]);

  useEffect(() => {
    const unsubscribe = videoProgress.on('change', (v) => {
      if (videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = v * videoRef.current.duration;
      }
    });
    return () => unsubscribe();
  }, [videoProgress]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      setShowHero(v < 0.9);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

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

  return (
    <div className="min-h-screen gradient-surface">
      {/* Scroll-Based Video Hero */}
      <AnimatePresence>
        {showHero && (
          <motion.div
            ref={heroRef}
            style={{ opacity, scale }}
            className="h-screen sticky top-0 flex items-center justify-center overflow-hidden -z-10"
          >
            <div className="absolute inset-0 bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                preload="auto"
                poster="/hero-poster.jpg"
              >
                <source src="/dukaan-opening.mp4" type="video/mp4" />
              </video>

              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 opacity-90" />

              <motion.div
                initial={{ scaleY: 1 }}
                animate={{ scaleY: 0 }}
                transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 bg-slate-900 origin-top"
              />
            </div>

            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium mb-6"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Powered by AI • Built for India
                </motion.div>

                <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 tracking-tight">
                  Dukaan<span className="text-gradient-primary">Pilot</span>
                </h1>

                <p className="text-xl sm:text-2xl text-white/90 mb-8 font-medium">
                  Your Kirana&apos;s Autonomous Store Operator
                </p>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white/60"
                >
                  <ArrowDown className="w-6 h-6 mx-auto" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-20 bg-slate-50">
        {/* Header */}
        <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-smooth">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">DukaanPilot</h1>
                  <p className="text-xs text-slate-600">Sharma General Store</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <nav className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/orders"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Orders
                  </Link>
                  <Link
                    href="/inventory"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  >
                    <Archive className="w-4 h-4" />
                    Inventory
                  </Link>
                </nav>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-700">LIVE</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Operator Section */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-40">
          {!result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16"
            >
              <div className="inline-flex p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl mb-6 shadow-smooth">
                <Package className="w-12 h-12 text-orange-600" />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-3">
                Autonomous Store Operations
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Type a customer order in Hindi, Hinglish, or English. Watch as AI handles product search,
                inventory checks, pricing, and order placement — all automatically.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.requestId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth-lg">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Autonomous Activity
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {result.events.map((event, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.4 }}
                        className="flex items-start gap-3 group"
                      >
                        <div className="mt-1 flex-shrink-0">
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm text-slate-700 leading-relaxed">{event.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {result.success && result.order ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: result.events.length * 0.08 + 0.2, duration: 0.5 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-smooth-lg"
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-xl bg-green-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <ShoppingCart className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                          Order #{result.order.order_id.slice(0, 8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          {result.order.items_count} {result.order.items_count === 1 ? 'item' : 'items'} • {formatCurrency(result.order.total)}
                        </p>
                        <div className="bg-white rounded-xl p-4 border border-green-200">
                          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                            {result.response}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : result.success ? (
                  <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 shadow-smooth">
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {result.response}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 rounded-2xl border border-red-200 p-6 shadow-smooth"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900 mb-1">Request Failed</p>
                        <p className="text-sm text-red-700 leading-relaxed">{result.response}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Fixed Input Bar */}
        <div className="fixed bottom-0 left-0 right-0 glass border-t border-slate-200/50 shadow-xl z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='e.g. "Bhaiya 2 Maggi, 1 milk aur 1 bread de do"'
                disabled={loading}
                className="flex-1 px-5 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-[15px]"
              />
              <motion.button
                type="submit"
                disabled={loading || !message.trim()}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="px-6 py-3.5 gradient-primary text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-smooth"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
