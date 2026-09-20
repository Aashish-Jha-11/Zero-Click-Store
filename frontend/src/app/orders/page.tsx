'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Package, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getOrders } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Emil Kowalski spring properties
const springyTransition = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasAuth(!!data.session));

    async function load() {
      try {
        const data = await getOrders();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  if (!hasAuth && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 text-center max-w-sm">
          <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
          <Link href="/" className="text-orange-500 font-semibold hover:underline">Return to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-6 h-[72px]">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Order History</h1>
              <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">Transactions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springyTransition}
            className="bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm flex flex-col justify-between h-40"
          >
            <CheckCircle className="w-6 h-6 text-green-500 mb-4" />
            <div>
              <p className="text-[2.5rem] leading-none font-black text-slate-900 mb-1">{orders.length}</p>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Total Orders</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springyTransition, delay: 0.1 }}
            className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-xl flex flex-col justify-between h-40 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <ShoppingCart className="w-6 h-6 text-orange-400 mb-4 relative z-10" />
            <div className="relative z-10">
              <p className="text-[2.5rem] leading-none font-black text-white mb-1">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Revenue</p>
            </div>
          </motion.div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-slate-300 animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-slate-200/60 p-16 text-center text-slate-500">
            No orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springyTransition, delay: idx * 0.05 }}
                className="bg-white rounded-[1.5rem] border border-slate-200/60 p-6 sm:p-8 hover:shadow-smooth-lg transition-shadow group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-slate-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-widest">
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-wide uppercase">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(order.created_at)}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-3xl font-black text-slate-900">{formatCurrency(order.total)}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-4 space-y-2 border border-slate-100">
                  {order.order_items.map((item: any, itemIdx: number) => (
                    <div key={itemIdx} className="flex justify-between items-center text-sm">
                      <p className="font-medium text-slate-700 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">{item.quantity}</span>
                        {item.product.name}
                      </p>
                      <p className="font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
