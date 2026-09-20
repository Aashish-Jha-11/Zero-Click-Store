'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PackageX, BellRing, Plus, Minus, Trash2, Check, X, Pencil } from 'lucide-react';
import {
  getInventory, getLowStockAlerts, createProduct, updateProduct, deleteProduct,
  type LowStockAlert, type Product,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import AppHeader, { AuthRequired } from '@/components/AppHeader';

/** Stock shown against the reorder line, so "is this low?" needs no arithmetic. */
function StockBar({ qty, threshold }: { qty: number; threshold: number }) {
  const ceiling = Math.max(threshold * 4, 20);
  const pct = Math.min(100, (qty / ceiling) * 100);
  const tone = qty === 0 ? 'bg-danger-500' : qty <= threshold ? 'bg-warn-500' : 'bg-success-500';
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

const BLANK = { name: '', category: '', price: '', stock_quantity: '', unit: 'pack' };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAuth, setHasAuth] = useState(false);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const [inv, al] = await Promise.all([getInventory(), getLowStockAlerts()]);
    setInventory(inv.inventory ?? []);
    setAlerts(al.alerts ?? []);
    setThreshold(al.threshold ?? 5);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasAuth(!!data.session));
    load()
      .catch((e) => setError(e?.message ?? 'Could not load inventory'))
      .finally(() => setLoading(false));
  }, []);

  /** Optimistic so the shelf feels immediate; reverts and reports on failure. */
  const adjustStock = async (p: Product, delta: number) => {
    const next = Math.max(0, p.stock_quantity + delta);
    if (next === p.stock_quantity) return;
    setInventory((cur) => cur.map((x) => (x.id === p.id ? { ...x, stock_quantity: next } : x)));
    setBusyId(p.id);
    try {
      await updateProduct(p.id, { stock_quantity: next });
      const al = await getLowStockAlerts();
      setAlerts(al.alerts ?? []);
    } catch (e: any) {
      setInventory((cur) =>
        cur.map((x) => (x.id === p.id ? { ...x, stock_quantity: p.stock_quantity } : x))
      );
      setError(e?.message ?? 'Could not update stock');
    } finally {
      setBusyId(null);
    }
  };

  const savePrice = async (p: Product) => {
    const price = Number(editPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be a number');
      return;
    }
    setBusyId(p.id);
    try {
      const { product } = await updateProduct(p.id, { price });
      setInventory((cur) => cur.map((x) => (x.id === p.id ? { ...x, ...product } : x)));
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not update price');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Product) => {
    setBusyId(p.id);
    try {
      await deleteProduct(p.id);
      setInventory((cur) => cur.filter((x) => x.id !== p.id));
      setAlerts((cur) => cur.filter((a) => a.id !== p.id));
    } catch (e: any) {
      setError(e?.message ?? 'Could not remove product');
    } finally {
      setBusyId(null);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createProduct({
        name: draft.name,
        category: draft.category || null,
        unit: draft.unit || 'unit',
        price: Number(draft.price),
        stock_quantity: Number(draft.stock_quantity),
      });
      setDraft(BLANK);
      setAdding(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not add product');
    } finally {
      setSaving(false);
    }
  };

  if (!hasAuth && !loading) return <AuthRequired />;

  const field =
    'w-full rounded-control bg-surface-sunken px-3 py-2.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader
        title="Inventory"
        subtitle={loading ? 'Loading…' : `${inventory.length} items · reorder line ${threshold}`}
      />

      <main className="mx-auto max-w-3xl px-5 py-8 pb-24 sm:px-6">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-start gap-3 rounded-card bg-danger-50 px-5 py-4"
            >
              <p className="flex-1 text-[0.9375rem] font-medium text-danger-700">{error}</p>
              <button onClick={() => setError(null)} aria-label="Dismiss">
                <X className="h-4 w-4 text-danger-700" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {alerts.length > 0 && (
          <div className="mb-5 rounded-card bg-warn-50 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <BellRing className="h-[18px] w-[18px] shrink-0 text-warn-700" strokeWidth={2.2} />
              <p className="text-[0.9375rem] font-semibold text-warn-700">
                {alerts.length} {alerts.length === 1 ? 'item needs' : 'items need'} restocking
              </p>
            </div>
            <p className="tnum mt-1.5 pl-[28px] text-[0.875rem] leading-relaxed text-warn-700/85">
              {alerts.map((a) => `${a.name} (${a.stock_quantity})`).join(' · ')}
            </p>
          </div>
        )}

        {/* Add product */}
        <div className="mb-5">
          <AnimatePresence mode="wait">
            {!adding ? (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAdding(true)}
                className="flex w-full items-center justify-center gap-2 rounded-card bg-surface-raised py-3.5 text-[0.9375rem] font-semibold text-ink-700 shadow-e1 transition-all hover:-translate-y-px hover:text-ink-900 hover:shadow-e2"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
                Add product
              </motion.button>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={add}
                className="overflow-hidden rounded-card bg-surface-raised p-5 shadow-e2"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className={`${field} sm:col-span-2`}
                    placeholder="Product name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                    autoFocus
                  />
                  <input
                    className={field}
                    placeholder="Category"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  />
                  <input
                    className={field}
                    placeholder="Unit (pack, litre…)"
                    value={draft.unit}
                    onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                  />
                  <input
                    className={`${field} tnum`}
                    placeholder="Price ₹"
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    required
                  />
                  <input
                    className={`${field} tnum`}
                    placeholder="Stock"
                    inputMode="numeric"
                    value={draft.stock_quantity}
                    onChange={(e) => setDraft({ ...draft, stock_quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-control bg-brand-500 py-2.5 text-[0.9375rem] font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:opacity-60"
                  >
                    {saving ? 'Adding…' : 'Add to shelf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setDraft(BLANK);
                    }}
                    className="rounded-control bg-surface-sunken px-5 py-2.5 text-[0.9375rem] font-semibold text-ink-700 transition-colors hover:bg-ink-200"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="grid place-items-center rounded-card bg-surface-raised py-24 shadow-e1">
            <Loader2 className="h-7 w-7 animate-spin text-ink-400" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="rounded-card bg-surface-raised px-6 py-20 text-center shadow-e1">
            <PackageX className="mx-auto mb-4 h-8 w-8 text-ink-400" />
            <p className="font-display text-[1.125rem] font-bold text-ink-900">Your shelf is empty</p>
            <p className="mx-auto mt-2 max-w-[38ch] text-[0.9375rem] leading-relaxed text-ink-600">
              Add your first product above and the operator will start selling it.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-card bg-surface-raised shadow-e1">
            {inventory.map((item) => {
              const low = item.stock_quantity <= threshold;
              const busy = busyId === item.id;
              const editing = editingId === item.id;

              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-3 px-4 py-3.5 not-last:border-b not-last:border-line sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-semibold leading-tight text-ink-900">
                      {item.name}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.8125rem] text-ink-500">₹</span>
                          <input
                            className="tnum w-20 rounded bg-surface-sunken px-2 py-1 text-[0.8125rem] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={editPrice}
                            inputMode="decimal"
                            autoFocus
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePrice(item);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => savePrice(item)}
                            aria-label="Save price"
                            className="grid h-6 w-6 place-items-center rounded bg-success-500 text-white"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel"
                            className="grid h-6 w-6 place-items-center rounded bg-ink-200 text-ink-700"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditPrice(String(item.price ?? ''));
                          }}
                          className="tnum inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-500 transition-colors hover:text-ink-900"
                        >
                          {Number.isFinite(Number(item.price)) ? formatCurrency(Number(item.price)) : '—'} · {item.category ?? '—'}
                          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-w-[12rem]">
                      <StockBar qty={item.stock_quantity} threshold={threshold} />
                    </div>
                  </div>

                  {/* Stock stepper — large targets, the most frequent action. */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => adjustStock(item, -1)}
                      disabled={busy || item.stock_quantity === 0}
                      aria-label={`Reduce ${item.name} stock`}
                      className="grid h-9 w-9 place-items-center rounded-control bg-surface-sunken text-ink-700 transition-colors hover:bg-ink-200 disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.6} />
                    </button>

                    <span
                      data-numeric
                      className={`tnum font-display w-10 text-center text-[1.125rem] font-bold ${
                        item.stock_quantity === 0
                          ? 'text-danger-700'
                          : low
                            ? 'text-warn-700'
                            : 'text-ink-900'
                      }`}
                    >
                      {item.stock_quantity}
                    </span>

                    <button
                      onClick={() => adjustStock(item, 1)}
                      disabled={busy}
                      aria-label={`Increase ${item.name} stock`}
                      className="grid h-9 w-9 place-items-center rounded-control bg-surface-sunken text-ink-700 transition-colors hover:bg-ink-200 disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.6} />
                    </button>

                    <button
                      onClick={() => remove(item)}
                      disabled={busy}
                      aria-label={`Remove ${item.name}`}
                      className="ml-1 grid h-9 w-9 place-items-center rounded-control text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
