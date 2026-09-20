'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

/** Shared sub-page chrome. Previously duplicated across Orders and Inventory,
 *  which is how the two drifted apart visually. */
export default function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <div className="flex h-[68px] items-center gap-4">
          <Link
            href="/"
            aria-label="Back to operator"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-sunken text-ink-700 transition-colors hover:bg-ink-200 hover:text-ink-900"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[0.9375rem] font-bold leading-tight text-ink-900">
              {title}
            </h1>
            {subtitle && (
              <p className="tnum text-[0.75rem] leading-tight text-ink-500">{subtitle}</p>
            )}
          </div>
          <Image
            src="/mark.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain opacity-80"
          />
          {action}
        </div>
        <div className="h-px bg-line" />
      </div>
    </header>
  );
}

export function AuthRequired() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-5">
      <div className="w-full max-w-sm rounded-card bg-surface-raised p-8 text-center shadow-e2">
        <h2 className="font-display text-[1.25rem] font-bold text-ink-900">Sign in required</h2>
        <p className="mt-2 text-[0.9375rem] text-ink-600">
          This view reads your store&apos;s live data.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-control bg-brand-500 px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
