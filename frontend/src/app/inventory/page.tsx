'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingDown, AlertTriangle, ArrowLeft, Boxes } from 'lucide-react';
import Link from 'next/link';
import { getInventory } from '@/lib/api';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock_quantity: number;
  unit: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <div className="min-h-screen gradient-surface">
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-smooth">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Inventory</h1>
                <p className="text-xs text-slate-600">Stock Management</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{inventory.length}</p>
            <p className="text-sm font-medium text-slate-600">Total Products</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{lowStock.length}</p>
            <p className="text-sm font-medium text-slate-600">Low Stock Items</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{totalStock}</p>
            <p className="text-sm font-medium text-slate-600">Total Units</p>
          </motion.div>
        </div>

        {lowStock.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 mb-8 shadow-smooth">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-900 mb-1">Low Stock Alert</p>
                <p className="text-sm text-orange-700">{lowStock.length} {lowStock.length === 1 ? 'item is' : 'items are'} running low on stock</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-smooth-lg">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading inventory...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inventory.map((item, idx) => (
                    <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{item.stock_quantity} {item.unit}</td>
                      <td className="px-6 py-4 text-right">
                        {item.stock_quantity === 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Out of Stock</span>
                        ) : item.stock_quantity < 5 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Critical</span>
                        ) : item.stock_quantity < 10 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Low</span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Good</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
