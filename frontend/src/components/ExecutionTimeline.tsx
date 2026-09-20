'use client';

import { motion } from 'framer-motion';
import {
  MessageSquare, Brain, Search, PackageCheck, IndianRupee, ReceiptText,
  ArrowDownUp, CheckCircle2, AlertTriangle, XCircle, Database, Cpu, BellRing,
} from 'lucide-react';
import type { AgentResponse } from '@/lib/api';

/**
 * The element Track 1 is judged on: proof that every step hit the database.
 * "Is this an autonomous operator, or just a chatbot?" is answered here.
 */

type EventStyle = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bg: string;
  fg: string;
  label: string;
};

const STYLES: Record<string, EventStyle> = {
  request_received:     { icon: MessageSquare, bg: 'bg-ink-100',     fg: 'text-ink-600',     label: 'Request' },
  intent_parsed:        { icon: Brain,         bg: 'bg-info-50',     fg: 'text-info-700',    label: 'AI parsing' },
  product_found:        { icon: Search,        bg: 'bg-info-50',     fg: 'text-info-700',    label: 'DB retrieval' },
  inventory_checked:    { icon: PackageCheck,  bg: 'bg-info-50',     fg: 'text-info-700',    label: 'Inventory check' },
  price_verified:       { icon: IndianRupee,   bg: 'bg-info-50',     fg: 'text-info-700',    label: 'Pricing' },
  order_created:        { icon: ReceiptText,   bg: 'bg-success-50',  fg: 'text-success-700', label: 'Order created' },
  inventory_updated:    { icon: ArrowDownUp,   bg: 'bg-success-50',  fg: 'text-success-700', label: 'Stock updated' },
  confirmation_sent:    { icon: CheckCircle2,  bg: 'bg-success-50',  fg: 'text-success-700', label: 'Confirmation' },
  low_stock_alert:      { icon: BellRing,      bg: 'bg-warn-50',     fg: 'text-warn-700',    label: 'Restock alert' },
  clarification_needed: { icon: AlertTriangle, bg: 'bg-warn-50',     fg: 'text-warn-700',    label: 'Clarification' },
  workflow_failed:      { icon: XCircle,       bg: 'bg-danger-50',   fg: 'text-danger-700',  label: 'Blocked' },
};

const FALLBACK: EventStyle = {
  icon: CheckCircle2, bg: 'bg-ink-100', fg: 'text-ink-600', label: 'Step',
};

/** Surface the DB-level fact behind a tool call so it reads as evidence. */
function proofFor(ev: AgentResponse['events'][number]): string | null {
  const m = ev.metadata;
  const r = m?.result as any;
  if (!m?.tool || !r) return null;

  switch (m.tool) {
    case 'search_products': {
      const p = r.products?.[0];
      return p ? `products.id ${String(p.id).slice(0, 8)} · ₹${p.price} · stock ${p.stock_quantity}` : null;
    }
    case 'check_inventory':
      return `SELECT stock_quantity → ${r.availableQuantity} · need ${r.requested}`;
    case 'calculate_cart':
      return `${r.items?.length ?? 0} line items · subtotal ₹${r.subtotal}`;
    case 'create_order':
      return `INSERT orders → ${String(r.order_id).slice(0, 8)} · ${r.items_count} items · ₹${r.total}`;
    default:
      return null;
  }
}

export default function ExecutionTimeline({ result }: { result: AgentResponse }) {
  const isFallback = result.mode === 'fallback';
  const dbOps = result.events.filter((e) => e.metadata?.tool).length;

  return (
    <div className="rounded-card bg-surface-raised p-6 shadow-e1">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Execution log
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
              isFallback ? 'bg-warn-50 text-warn-700' : 'bg-info-50 text-info-700'
            }`}
            title={
              isFallback
                ? 'The LLM provider was unreachable. The same typed tools and the same atomic transaction ran under a deterministic parser.'
                : `Planned by ${result.provider} · ${result.model}`
            }
          >
            <Cpu className="h-3 w-3" />
            {isFallback ? 'Deterministic fallback' : result.model}
          </span>

          <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-600">
            <Database className="h-3 w-3" />
            {dbOps} DB {dbOps === 1 ? 'op' : 'ops'}
          </span>
        </div>
      </div>

      <ol className="relative">
        {/* the spine stops at the last node instead of running past it */}
        <div className="absolute left-[15px] top-3 bottom-4 w-px bg-line" aria-hidden />

        {result.events.map((event, idx) => {
          const style = STYLES[event.type] ?? FALLBACK;
          const Icon = style.icon;
          const proof = proofFor(event);

          return (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.6), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-3.5 pb-4 last:pb-0"
            >
              <div className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.bg}`}>
                <Icon className={`h-[15px] w-[15px] ${style.fg}`} strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  {style.label}
                </p>
                <p className="mt-0.5 text-[0.9375rem] font-medium leading-snug text-ink-800">
                  {event.message}
                </p>
                {proof && (
                  <p className="tnum mt-1.5 inline-block break-all rounded-md bg-surface-sunken px-2 py-1 font-mono text-[0.6875rem] leading-relaxed text-ink-600">
                    {proof}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
