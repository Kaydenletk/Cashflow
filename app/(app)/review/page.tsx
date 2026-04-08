/**
 * app/(app)/review/page.tsx
 *
 * Standalone review page. Same UX as the dashboard banner + modal
 * combination, but reachable directly via /review for deep-linking
 * and bookmarking. Useful when the user wants to focus on clearing the
 * review queue without navigating the dashboard.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CategoryPickerModal } from '@/components/review/category-picker-modal';
import { Button } from '@/components/ui/button';
import { usePendingReviews } from '@/lib/hooks/use-pending-reviews';

export default function ReviewPage() {
  const router = useRouter();
  const { reviews, loading } = usePendingReviews();
  // Modal starts open by default since the whole purpose of this route
  // is to dive into review.
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Review queue
            </h1>
            <p className="mt-1 text-sm text-[#A3A3A3]">
              Categorize unknown merchants so Compound can auto-classify them
              next time.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            Back
          </Button>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#262626] bg-[#141414] px-6 py-8 text-center text-sm text-[#525252]">
            Loading review queue…
          </div>
        )}

        {!loading && reviews.length === 0 && (
          <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-6 py-12 text-center">
            <div className="text-sm uppercase tracking-wide text-[#10B981]">
              All clear
            </div>
            <div className="mt-2 text-lg font-medium">
              No merchants waiting for review.
            </div>
            <p className="mt-2 text-xs text-[#A3A3A3]">
              Upload another statement and Compound will only bring back the
              merchants it doesn&apos;t recognize.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push('/upload')}>
                Upload a statement
              </Button>
              <Button onClick={() => router.push('/')}>
                Back to dashboard
              </Button>
            </div>
          </div>
        )}

        {!loading && reviews.length > 0 && (
          <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-6 py-5">
            <div className="text-sm font-medium text-[#FAFAFA]">
              {reviews.length} merchant
              {reviews.length === 1 ? '' : 's'} waiting
            </div>
            <p className="mt-1 text-xs text-[#A3A3A3]">
              Click below to open the picker.
            </p>
            <div className="mt-3">
              <Button onClick={() => setModalOpen(true)}>
                Open category picker
              </Button>
            </div>
          </div>
        )}

        <CategoryPickerModal
          items={reviews}
          open={modalOpen && reviews.length > 0}
          onOpenChange={setModalOpen}
        />
      </div>
    </main>
  );
}
