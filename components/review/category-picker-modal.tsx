/**
 * components/review/category-picker-modal.tsx
 *
 * The human-in-the-loop category picker. Shown when the user clicks the
 * "N merchants need review" dashboard banner. Iterates one row per
 * unique unknown merchant (aggregated from pending_reviews Firestore docs).
 *
 * Flow:
 *   1. User assigns a bucket + optional subcategory + optional "remember
 *      as rule" checkbox for each merchant
 *   2. "Save N rules and apply" button is enabled once every row has a
 *      bucket selected
 *   3. Calls resolvePendingReviewsBatch() which in a single writeBatch:
 *      - updates every affected transaction (bucket, classifiedBy: USER_RULE)
 *      - deletes the pending_reviews docs
 *      - creates user merchant rules for rows where "remember" is on
 *   4. Modal closes; subscription in usePendingReviews re-renders banner
 */

'use client';

import { useMemo, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CategoryPickerRow,
  type RowDecision,
} from '@/components/review/category-picker-row';
import { resolvePendingReviewsBatch } from '@/lib/firebase/pending-reviews';
import { useAuth } from '@/lib/hooks/use-auth';
import type { PendingReviewItem } from '@/lib/types/review';

interface CategoryPickerModalProps {
  items: PendingReviewItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultDecision(): RowDecision {
  return {
    bucket: null,
    subcategory: '',
    saveAsRule: true,
  };
}

/**
 * Derive a reasonable rule pattern from a raw merchant string. We take
 * the first "word" (alphanumeric run) lowercased — this catches most
 * repeating merchants (e.g. "PAYPAL", "SCHWAB", "APPLECARD") without
 * accidentally matching unrelated transactions.
 */
function derivePattern(merchantRaw: string): string {
  const match = merchantRaw.match(/[A-Za-z][A-Za-z0-9&]*/);
  return (match?.[0] ?? merchantRaw).toLowerCase();
}

export function CategoryPickerModal({
  items,
  open,
  onOpenChange,
}: CategoryPickerModalProps) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Record<string, RowDecision>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset decisions when the item list changes (new review session).
  const itemsKey = useMemo(
    () => items.map((i) => i.merchantKey).join('|'),
    [items],
  );

  // Reset decisions state whenever a different set of items comes in.
  useMemo(() => {
    const next: Record<string, RowDecision> = {};
    for (const item of items) {
      next[item.merchantKey] = decisions[item.merchantKey] ?? defaultDecision();
    }
    setDecisions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const decidedCount = Object.values(decisions).filter(
    (d) => d.bucket !== null,
  ).length;
  const totalCount = items.length;
  const allDecided = totalCount > 0 && decidedCount === totalCount;

  async function handleSave() {
    if (!user || !allDecided) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = items
        .filter((item) => decisions[item.merchantKey]?.bucket !== null)
        .map((item) => {
          const d = decisions[item.merchantKey];
          return {
            merchantKey: item.merchantKey,
            merchantRaw: item.merchantRaw,
            bucket: d.bucket!,
            subcategory: d.subcategory.trim() || undefined,
            saveAsRule: d.saveAsRule,
            rulePattern: d.saveAsRule
              ? derivePattern(item.merchantRaw)
              : undefined,
          };
        });

      await resolvePendingReviewsBatch(user.uid, payload);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Save failed: ${err.message}`
          : 'Save failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] sm:max-w-2xl bg-[#141414] text-[#FAFAFA] ring-1 ring-[#262626] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Categorize{' '}
            <span className="text-[#10B981]">{totalCount}</span> unknown
            merchant{totalCount === 1 ? '' : 's'}
          </DialogTitle>
          <p className="mt-1 text-xs text-[#A3A3A3]">
            Assign a bucket to each merchant. Check &quot;Remember rule&quot; to
            auto-classify them on future imports.
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <CategoryPickerRow
              key={item.merchantKey}
              item={item}
              decision={decisions[item.merchantKey] ?? defaultDecision()}
              onChange={(next) =>
                setDecisions((prev) => ({
                  ...prev,
                  [item.merchantKey]: next,
                }))
              }
            />
          ))}
          {totalCount === 0 && (
            <div className="py-12 text-center text-sm text-[#525252]">
              Nothing to review.
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#262626] pt-3">
          <div className="text-xs text-[#525252]">
            {decidedCount} of {totalCount} decided
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!allDecided || submitting || totalCount === 0}
            >
              {submitting ? 'Saving…' : `Save ${decidedCount} rule${decidedCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
