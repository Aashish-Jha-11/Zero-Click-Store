'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle2, XCircle, Package, ShoppingCart, Archive, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { runAgent, type AgentResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">DukaanPilot</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Sharma General Store</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <nav className="hidden sm:flex items-center gap-4">
                <Link
                  href="/orders"
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Orders
                </Link>
                <Link
                  href="/inventory"
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Inventory
                </Link>
              </nav>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Live System</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full border border-orange-200 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI Operator Ready
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Autonomous Store Operations
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Accept orders naturally. The AI will autonomously find products, check inventory limits, verify prices, and create the order transaction seamlessly.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.requestId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Timeline Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    Execution Audit Log
                  </h3>
                </div>

                <div className="space-y-4">
                  {result.events.map((event, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-4"
                    >
                      <div className="mt-0.5">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-slate-700">{event.message}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Order Result Card */}
              {result.success && result.order ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: result.events.length * 0.05 + 0.1 }}
                  className="bg-white rounded-2xl border-2 border-green-500 overflow-hidden shadow-sm"
                >
                  <div className="bg-green-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-green-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-700 uppercase tracking-widest mb-1">
                          Order Finalized
                        </p>
                        <h3 className="text-2xl font-black text-green-900">
                          #{result.order.order_id.slice(0, 8).toUpperCase()}
                        </h3>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-green-700 mb-1">
                        {result.order.items_count} {result.order.items_count === 1 ? 'Item' : 'Items'}
                      </p>
                      <p className="text-3xl font-black text-green-700">
                        {formatCurrency(result.order.total)}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 bg-white">
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                      {result.response}
                    </p>
                  </div>
                </motion.div>
              ) : result.success ? (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-8 shadow-sm">
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed text-lg">
                    {result.response}
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 rounded-2xl border-2 border-red-200 overflow-hidden shadow-sm"
                >
                  <div className="p-6 sm:p-8 flex items-start gap-4">
                    <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-red-900 mb-2">Request Blocked</h3>
                      <p className="text-red-800 leading-relaxed text-lg">{result.response}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Try "Bhaiya 2 Maggi, 1 milk aur 1 bread de do"...'
              disabled={loading}
              className="flex-1 px-6 py-4 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 text-lg transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Working
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Execute
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

