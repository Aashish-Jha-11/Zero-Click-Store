'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingDown, AlertTriangle, ArrowLeft, Boxes } from 'lucide-react';
import Link from 'next/link';
import { getInventory } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const springyTransition = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasAuth(!!data.session));

    async function load() {
      try {
        const data = await getInventory();
        setInventory(data.inventory || []);
      } catch (error) {
        console.error('Failed to load inventory:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const lowStock = inventory.filter((item) => item.stock_quantity < 10);
  const totalStock = inventory.reduce((sum, item) => sum + item.stock_quantity, 0);

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
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Inventory</h1>
              <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">Stock Status</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springyTransition}
            className="bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm flex flex-col justify-between h-40"
          >
            <Boxes className="w-6 h-6 text-indigo-500 mb-4" />
            <div>
              <p className="text-[2.5rem] leading-none font-black text-slate-900 mb-1">{inventory.length}</p>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Active Items</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springyTransition, delay: 0.1 }}
            className={`bg-white rounded-[2rem] border p-8 shadow-sm flex flex-col justify-between h-40 ${lowStock.length > 0 ? 'border-orange-200' : 'border-slate-200/60'}`}
          >
            <TrendingDown className={`w-6 h-6 mb-4 ${lowStock.length > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
            <div>
              <p className="text-[2.5rem] leading-none font-black text-slate-900 mb-1">{lowStock.length}</p>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Low Stock Items</p>
            </div>
          </motion.div>
        </div>

        {lowStock.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-orange-50 rounded-[1.5rem] border border-orange-100 p-6 mb-8 flex items-start gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-orange-900 mb-1">Attention Required</h3>
              <p className="text-orange-800 text-sm font-medium">You have {lowStock.length} items running low. Restocking is advised.</p>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-sm">
          {loading ? (
             <div className="py-20 text-center">
             <Loader2 className="w-8 h-8 text-slate-300 animate-spin mx-auto" />
           </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-xs">Product</th>
                    <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-xs">Category</th>
                    <th className="px-6 py-5 text-right font-bold text-slate-400 uppercase tracking-widest text-xs">Stock Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inventory.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-6 py-5 font-semibold text-slate-500">{item.category}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`font-black text-lg ${item.stock_quantity < 10 ? 'text-orange-500' : 'text-slate-900'}`}>
                            {item.stock_quantity}
                          </span>
                          {item.stock_quantity < 10 && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
