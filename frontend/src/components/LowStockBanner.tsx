'use client';

import { motion } from 'framer-motion';
import { BellRing, PackageX } from 'lucide-react';
import type { LowStockAlert } from '@/lib/api';

const SEVERITY = {
  out_of_stock: { bg: 'bg-danger-50', fg: 'text-danger-700', pill: 'bg-danger-500', Icon: PackageX, label: 'Sold out' },
  critical:     { bg: 'bg-warn-50',   fg: 'text-warn-700',   pill: 'bg-warn-500',   Icon: BellRing, label: 'Critical' },
  low:          { bg: 'bg-warn-50',   fg: 'text-warn-700',   pill: 'bg-brand-500',  Icon: BellRing, label: 'Low' },
} as const;

/** Bonus feature: the sale that pushed an item under the restock line is
 *  surfaced the moment it happens, not on the next dashboard refresh. */
export default function LowStockBanner({ alerts }: { alerts: LowStockAlert[] }) {
  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const s = SEVERITY[a.severity] ?? SEVERITY.low;
        const { Icon } = s;
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-3.5 rounded-card px-5 py-4 ${s.bg}`}
          >
            <Icon className={`h-[18px] w-[18px] shrink-0 ${s.fg}`} strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
              <p className={`text-[0.9375rem] font-semibold leading-tight ${s.fg}`}>{a.name}</p>
              <p className={`tnum mt-0.5 text-[0.8125rem] leading-tight ${s.fg} opacity-80`}>
                {a.stock_quantity === 0
                  ? 'Reorder now'
                  : `${a.stock_quantity} ${a.unit ?? 'unit'}${a.stock_quantity === 1 ? '' : 's'} left · reorder soon`}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white ${s.pill}`}>
              {s.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
