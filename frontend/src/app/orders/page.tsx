'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowLeft, Package, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getOrders } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  customer: { name: string; phone: string } | null;
  order_items: Array<{
    quantity: number;
    unit_price: number;
    product: { name: string; unit: string };
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <div className="min-h-screen gradient-surface">
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-smooth">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Orders</h1>
                <p className="text-xs text-slate-600">Order History</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{orders.length}</p>
            <p className="text-sm font-medium text-slate-600">Total Orders</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
          </motion.div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-smooth">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-smooth">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h3>
            <p className="text-slate-600 mb-6">Create your first order from the main operator screen</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg transition-all">
              <ShoppingCart className="w-4 h-4" />
              Go to Operator
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-smooth-lg transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">{order.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {formatDate(order.created_at)}
                        </div>
                        {order.customer && <span className="hidden sm:inline">• {order.customer.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(order.total)}</p>
                    <p className="text-sm text-slate-600 mt-1">{order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <div className="space-y-3">
                    {order.order_items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{item.product.name}</span>
                        </div>
                        <div className="text-sm text-slate-600 font-medium">
                          {item.quantity} × {formatCurrency(item.unit_price)} = <span className="font-bold text-slate-900">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
