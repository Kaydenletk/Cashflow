/**
 * app/(app)/today/page.tsx
 *
 * Today homepage. Stitches together MonthNetCard + TodayTimeline + AddTransactionFab.
 * The TwoNumbersBar lives in the parent (app) layout.
 */

import { MonthNetCard } from '@/components/month-net-card';
import { TodayTimeline } from '@/components/today-timeline';
import { AddTransactionFab } from '@/components/add-transaction-fab';

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-md">
      <MonthNetCard />
      <section className="px-6 py-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        <TodayTimeline />
      </section>
      <AddTransactionFab />
    </div>
  );
}
