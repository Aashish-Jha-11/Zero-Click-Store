'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ReceiptText } from 'lucide-react';
import { getOrders } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import AppHeader, { AuthRequired } from '@/components/AppHeader';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string; unit: string | null } | null;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasAuth(!!data.session));

    (async () => {
      try {
        const data = await getOrders();
        setOrders(data.orders ?? []);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!hasAuth && !loading) return <AuthRequired />;

  const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader
        title="Orders"
        subtitle={
          loading
            ? 'Loading…'
            : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} · ${formatCurrency(revenue, { decimals: false })}`
        }
      />

      <main className="mx-auto max-w-3xl px-5 py-8 pb-24 sm:px-6">
        {error && (
          <div className="mb-4 rounded-card bg-danger-50 px-5 py-4 text-[0.9375rem] font-medium text-danger-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center rounded-card bg-surface-raised py-24 shadow-e1">
            <Loader2 className="h-7 w-7 animate-spin text-ink-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-card bg-surface-raised px-6 py-20 text-center shadow-e1">
            <ReceiptText className="mx-auto mb-4 h-8 w-8 text-ink-400" />
            <p className="font-display text-[1.125rem] font-bold text-ink-900">No orders yet</p>
            <p className="mx-auto mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-ink-600">
              Send the operator a customer request and the order will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <motion.article
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(idx * 0.04, 0.4),
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="overflow-hidden rounded-card bg-surface-raised shadow-e1"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-5 pt-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2
                        data-numeric
                        className="tnum font-display text-[1.0625rem] font-bold leading-none text-ink-900"
                      >
                        #{order.id.slice(0, 8).toUpperCase()}
                      </h2>
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-success-700">
                        {order.status}
                      </span>
                    </div>
                    <p className="tnum mt-1.5 text-[0.8125rem] leading-none text-ink-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <p
                    data-numeric
                    className="tnum font-display text-[1.375rem] font-bold leading-none text-ink-900"
                  >
                    {formatCurrency(Number(order.total))}
                  </p>
                </header>

                {/* A divided list, not a card nested inside a card. */}
                <ul className="mt-4 border-t border-line">
                  {order.order_items?.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-2.5 not-last:border-b not-last:border-line"
                    >
                      <span
                        data-numeric
                        className="tnum grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-surface-sunken px-1.5 text-[0.75rem] font-bold text-ink-700"
                      >
                        {item.quantity}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-ink-800">
                        {item.product?.name ?? 'Unknown product'}
                      </span>
                      <span
                        data-numeric
                        className="tnum shrink-0 text-[0.875rem] font-semibold text-ink-700"
                      >
                        {formatCurrency(item.quantity * Number(item.unit_price))}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
