/**
 * components/review/pending-review-banner.tsx
 *
 * Sticky banner shown on the dashboard when the user has pending review
 * items. Hidden when the queue is empty. Opens the category picker
 * modal on click.
 *
 * Self-contained: subscribes to usePendingReviews and owns its own
 * modal-open state, so the dashboard just drops this component in and
 * doesn't need to coordinate.
 */

'use client';

import { useState } from 'react';

import { CategoryPickerModal } from '@/components/review/category-picker-modal';
import { usePendingReviews } from '@/lib/hooks/use-pending-reviews';

export function PendingReviewBanner() {
  const { reviews, loading } = usePendingReviews();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading || reviews.length === 0) return null;

  const totalPendingTransactions = reviews.reduce(
    (sum, r) => sum + r.occurrenceCount,
    0,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group flex w-full items-center justify-between gap-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-5 py-3 text-left transition-colors hover:bg-[#F59E0B]/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
            <WarningIcon />
          </div>
          <div>
            <div className="text-sm font-medium text-[#FAFAFA]">
              {reviews.length} merchant{reviews.length === 1 ? '' : 's'} need
              your review
            </div>
            <div className="text-xs text-[#A3A3A3]">
              {totalPendingTransactions} transaction
              {totalPendingTransactions === 1 ? '' : 's'} waiting to be
              categorized
            </div>
          </div>
        </div>
        <div className="text-xs text-[#F59E0B] group-hover:text-[#F59E0B]/80">
          Review now →
        </div>
      </button>

      <CategoryPickerModal
        items={reviews}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
