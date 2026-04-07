/**
 * components/today-timeline.tsx
 *
 * List of transactions logged today (local time). Empty state per spec.
 */

'use client';

import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { inSameDay } from '@/lib/calculations/ratios';

export function TodayTimeline() {
  const { transactions, loading } = useTransactions();
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = new Date();
  const todays = transactions
    .filter((t) => inSameDay(t.date, today))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (todays.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nothing logged today. Tap + to add.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {todays.map((t) => (
        <TransactionRow key={t.id} txn={t} />
      ))}
    </ul>
  );
}
