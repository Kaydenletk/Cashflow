/**
 * components/month-net-card.tsx
 *
 * Big monthly direction card. ONE signed dollar number + ONE word.
 * Per spec §8: this is the only place dollars appear on the Today screen.
 */

'use client';

import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { useTransactions } from '@/lib/hooks/use-transactions';
import { direction, monthlyNet } from '@/lib/calculations/ratios';
import { cn } from '@/lib/utils';

export function MonthNetCard() {
  const { transactions, loading } = useTransactions();
  const net = monthlyNet(transactions);
  const dir = direction(net);

  const Icon = dir === 'richer' ? ArrowUp : dir === 'poorer' ? ArrowDown : ArrowRight;
  const color =
    dir === 'richer' ? 'text-green-700' : dir === 'poorer' ? 'text-red-700' : 'text-muted-foreground';

  return (
    <section className="border-b px-6 py-8 text-center">
      <div className={cn('flex items-center justify-center gap-2 text-3xl font-bold tabular-nums', color)}>
        <Icon className="h-7 w-7" />
        {loading ? '—' : `${net >= 0 ? '+' : '−'}$${Math.abs(net).toFixed(0)}`}
      </div>
      <p className={cn('mt-1 text-sm', color)}>{dir} this month</p>
    </section>
  );
}
