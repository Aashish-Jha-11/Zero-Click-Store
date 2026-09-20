import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian digit grouping (1,08,240) — the format a kirana owner actually reads. */
export function formatCurrency(amount: number, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? true;
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount)}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
