/**
 * components/review/category-picker-row.tsx
 *
 * One row inside the HITL category picker modal — represents a single
 * unknown merchant the user needs to categorize. Shows:
 *   - Merchant raw text (truncated with full text on hover)
 *   - Occurrence count and total amount
 *   - Segmented control of 4 buckets (ASSET/LIABILITY/EXPENSE/INCOME)
 *   - Optional subcategory input
 *   - "Always classify this merchant this way" checkbox (default on)
 *
 * Controlled by the parent modal via props. Emits decisions upward.
 */

'use client';

import type { PendingReviewItem } from '@/lib/types/review';
import { Bucket } from '@/lib/types/transaction';
import { cn } from '@/lib/utils';

export interface RowDecision {
  bucket: Bucket | null;
  subcategory: string;
  saveAsRule: boolean;
}

interface CategoryPickerRowProps {
  item: PendingReviewItem;
  decision: RowDecision;
  onChange: (next: RowDecision) => void;
}

const BUCKETS: Array<{
  value: Bucket;
  label: string;
  activeClass: string;
}> = [
  {
    value: Bucket.ASSET,
    label: 'Asset',
    activeClass: 'border-[#10B981] bg-[#10B981]/15 text-[#10B981]',
  },
  {
    value: Bucket.INCOME,
    label: 'Income',
    activeClass: 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]',
  },
  {
    value: Bucket.EXPENSE,
    label: 'Expense',
    activeClass: 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]',
  },
  {
    value: Bucket.LIABILITY,
    label: 'Liability',
    activeClass: 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444]',
  },
];

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'auto',
  });
}

export function CategoryPickerRow({
  item,
  decision,
  onChange,
}: CategoryPickerRowProps) {
  const truncated =
    item.merchantRaw.length > 80
      ? item.merchantRaw.slice(0, 80) + '…'
      : item.merchantRaw;

  return (
    <div className="space-y-3 rounded-lg border border-[#262626] bg-[#0A0A0A] px-4 py-3">
      {/* Merchant identity line */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-mono text-xs text-[#FAFAFA]"
            title={item.merchantRaw}
          >
            {truncated}
          </div>
          <div className="mt-1 text-[11px] text-[#525252]">
            {item.occurrenceCount} transaction
            {item.occurrenceCount === 1 ? '' : 's'} ·{' '}
            <span
              className={
                item.totalAmount >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              }
            >
              {formatAmount(item.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Bucket segmented control */}
      <div className="grid grid-cols-4 gap-1.5">
        {BUCKETS.map((b) => {
          const active = decision.bucket === b.value;
          return (
            <button
              key={b.value}
              type="button"
              onClick={() =>
                onChange({ ...decision, bucket: active ? null : b.value })
              }
              className={cn(
                'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                active
                  ? b.activeClass
                  : 'border-[#262626] bg-transparent text-[#A3A3A3] hover:border-[#525252] hover:text-[#FAFAFA]',
              )}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Subcategory + save-as-rule toggle */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={decision.subcategory}
          onChange={(e) =>
            onChange({ ...decision, subcategory: e.target.value })
          }
          placeholder="Subcategory (optional, e.g. food_delivery)"
          className="flex-1 rounded-md border border-[#262626] bg-transparent px-3 py-1.5 text-xs text-[#FAFAFA] outline-none placeholder:text-[#525252] focus:border-[#10B981]/50"
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-[11px] text-[#A3A3A3]">
          <input
            type="checkbox"
            checked={decision.saveAsRule}
            onChange={(e) =>
              onChange({ ...decision, saveAsRule: e.target.checked })
            }
            className="h-3 w-3 accent-[#10B981]"
          />
          Remember rule
        </label>
      </div>
    </div>
  );
}
