'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, PackageX, BellRing } from 'lucide-react';
import { getInventory, getLowStockAlerts, type LowStockAlert } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import AppHeader, { AuthRequired } from '@/components/AppHeader';

interface Item {
  id: string;
  name: string;
  category: string | null;
  stock_quantity: number;
  unit: string | null;
}

/** Stock shown against the reorder line, so "is this low?" needs no arithmetic. */
function StockBar({ qty, threshold }: { qty: number; threshold: number }) {
  const ceiling = Math.max(threshold * 4, 20);
  const pct = Math.min(100, (qty / ceiling) * 100);
  const tone =
    qty === 0 ? 'bg-danger-500' : qty <= threshold ? 'bg-warn-500' : 'bg-success-500';

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      <div
        className="absolute inset-y-0 w-px bg-ink-400"
        style={{ left: `${(threshold / ceiling) * 100}%` }}
        title={`Reorder line: ${threshold}`}
      />
    </div>
  );
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAuth, setHasAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasAuth(!!data.session));

    (async () => {
      try {
        // The reorder line comes from the backend — hardcoding it here is how
        // this page previously disagreed with the agent's own alerts.
        const [inv, al] = await Promise.all([getInventory(), getLowStockAlerts()]);
        setInventory(inv.inventory ?? []);
        setAlerts(al.alerts ?? []);
        setThreshold(al.threshold ?? 5);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load inventory');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!hasAuth && !loading) return <AuthRequired />;

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader
        title="Inventory"
        subtitle={loading ? 'Loading…' : `${inventory.length} active items · reorder line ${threshold}`}
      />

      <main className="mx-auto max-w-3xl px-5 py-8 pb-24 sm:px-6">
        {error && (
          <div className="mb-4 rounded-card bg-danger-50 px-5 py-4 text-[0.9375rem] font-medium text-danger-700">
            {error}
          </div>
        )}

        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 rounded-card bg-warn-50 px-5 py-4"
          >
            <div className="flex items-center gap-2.5">
              <BellRing className="h-[18px] w-[18px] shrink-0 text-warn-700" strokeWidth={2.2} />
              <p className="text-[0.9375rem] font-semibold text-warn-700">
                {alerts.length} {alerts.length === 1 ? 'item needs' : 'items need'} restocking
              </p>
            </div>
            <p className="tnum mt-1.5 pl-[28px] text-[0.875rem] leading-relaxed text-warn-700/85">
              {alerts.map((a) => `${a.name} (${a.stock_quantity})`).join(' · ')}
            </p>
          </motion.div>
        )}

        {loading ? (
          <div className="grid place-items-center rounded-card bg-surface-raised py-24 shadow-e1">
            <Loader2 className="h-7 w-7 animate-spin text-ink-400" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="rounded-card bg-surface-raised px-6 py-20 text-center shadow-e1">
            <PackageX className="mx-auto mb-4 h-8 w-8 text-ink-400" />
            <p className="font-display text-[1.125rem] font-bold text-ink-900">No products yet</p>
            <p className="mx-auto mt-2 max-w-[40ch] text-[0.9375rem] leading-relaxed text-ink-600">
              If you expected stock here, the backend is probably unreachable. Check
              that it is running and that{' '}
              <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.8125rem]">
                NEXT_PUBLIC_API_BASE_URL
              </code>{' '}
              points at it.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-card bg-surface-raised shadow-e1">
            {inventory.map((item, idx) => {
              const low = item.stock_quantity <= threshold;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.4), duration: 0.3 }}
                  className="flex items-center gap-4 px-5 py-4 not-last:border-b not-last:border-line"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-semibold leading-tight text-ink-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-[0.8125rem] leading-tight text-ink-500">
                      {item.category ?? '—'}
                    </p>
                    <div className="mt-2 max-w-[13rem]">
                      <StockBar qty={item.stock_quantity} threshold={threshold} />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      data-numeric
                      className={`tnum font-display text-[1.375rem] font-bold leading-none ${
                        item.stock_quantity === 0
                          ? 'text-danger-700'
                          : low
                            ? 'text-warn-700'
                            : 'text-ink-900'
                      }`}
                    >
                      {item.stock_quantity}
                    </p>
                    <p className="mt-1 text-[0.75rem] leading-none text-ink-500">
                      {item.unit ?? 'unit'}
                      {item.stock_quantity === 1 ? '' : 's'}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
