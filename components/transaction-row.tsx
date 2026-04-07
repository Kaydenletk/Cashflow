/**
 * components/transaction-row.tsx
 *
 * One row in the Today timeline. Merchant + amount + colored bucket badge +
 * optional mood emoji. Read-only this slice.
 */

import { BucketBadge } from '@/components/bucket-badge';
import type { TransactionWithId } from '@/lib/firebase/transactions';
import { Mood } from '@/lib/types/transaction';

const MOOD_EMOJI: Record<Mood, string> = {
  HAPPY: '😊',
  NEUTRAL: '😐',
  REGRET: '😞',
};

export function TransactionRow({ txn }: { txn: TransactionWithId }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{txn.merchant}</span>
          {txn.mood && <span aria-hidden>{MOOD_EMOJI[txn.mood]}</span>}
        </div>
        {txn.note && <div className="truncate text-xs text-muted-foreground">{txn.note}</div>}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums">${txn.amount.toFixed(2)}</span>
        <BucketBadge bucket={txn.bucket} />
      </div>
    </li>
  );
}
