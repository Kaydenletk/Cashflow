/**
 * app/(app)/upload/page.tsx
 *
 * PDF upload + commit flow. Auth-gated (lives under the (app) route group).
 *
 * Sequence when the user drops a PDF:
 *   1. POST the File to /api/pdf/parse → receive { statement, parserName }
 *   2. Hydrate Date strings back into Date objects
 *   3. Run runPipeline() client-side with the current user's rules so the
 *      preview shows "N auto · M need review" without a server round-trip
 *   4. Show <BankDetectorPreview> — user clicks Import to commit
 *   5. On commit:
 *      a. addTransactionsBatch(userId, classified) — dedupes + writes
 *      b. upsertPendingReviewsBatch(userId, reviewItems) — seeds the HITL queue
 *      c. Success toast + redirect to dashboard (/dashboard)
 *
 * All Firestore writes happen client-side behind the auth-gated rules.
 * No firebase-admin on the server.
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BankDetectorPreview } from '@/components/upload/bank-detector-preview';
import { PdfDropzone } from '@/components/upload/pdf-dropzone';
import { Button } from '@/components/ui/button';
import { runPipeline, type PipelineOutput } from '@/lib/classification/pipeline';
import { addTransactionsBatch } from '@/lib/firebase/transactions';
import { upsertPendingReviewsBatch } from '@/lib/firebase/pending-reviews';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUserRules } from '@/lib/hooks/use-user-rules';
import type { ParsedStatement, ParsedTransaction } from '@/lib/parsers/types';
import type { PendingReviewItem } from '@/lib/types/review';

// ─── JSON hydration helpers ──────────────────────────────────────────────────
//
// ParsedStatement travels over JSON, which turns Date objects into ISO
// strings. We rebuild Date instances before passing to runPipeline() (which
// uses them directly).

interface JsonParsedTransaction extends Omit<ParsedTransaction, 'date'> {
  date: string;
}
interface JsonParsedStatement
  extends Omit<
    ParsedStatement,
    'periodStart' | 'periodEnd' | 'transactions'
  > {
  periodStart: string;
  periodEnd: string;
  transactions: JsonParsedTransaction[];
}

function hydrateStatement(json: JsonParsedStatement): ParsedStatement {
  return {
    ...json,
    periodStart: new Date(json.periodStart),
    periodEnd: new Date(json.periodEnd),
    transactions: json.transactions.map((t) => ({
      ...t,
      date: new Date(t.date),
    })),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

type Phase =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | {
      kind: 'previewing';
      statement: ParsedStatement;
      parserName: string;
      pipeline: PipelineOutput;
    }
  | { kind: 'committing' }
  | {
      kind: 'done';
      result: { written: number; skipped: number; reviewCount: number };
    }
  | { kind: 'error'; message: string };

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { rules: userRules } = useUserRules();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const handleFile = useCallback(
    async (file: File) => {
      setPhase({ kind: 'parsing' });
      try {
        const formData = new FormData();
        formData.set('file', file);

        const response = await fetch('/api/pdf/parse', {
          method: 'POST',
          body: formData,
        });
        const json = await response.json();

        if (!response.ok) {
          setPhase({
            kind: 'error',
            message: json.error ?? 'Unable to parse PDF.',
          });
          return;
        }

        const statement = hydrateStatement(json.statement);
        const pipeline = await runPipeline({
          parsed: statement.transactions,
          userRules,
          sourceFile: statement.sourceFile,
          sourceBank: statement.bank,
        });

        setPhase({
          kind: 'previewing',
          statement,
          parserName: json.parserName,
          pipeline,
        });
      } catch (err) {
        setPhase({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Network error.',
        });
      }
    },
    [userRules],
  );

  const handleCommit = useCallback(async () => {
    if (phase.kind !== 'previewing' || !user) return;

    setPhase({ kind: 'committing' });
    try {
      // 1. Write transactions (dedupes against existing hashes).
      const { written, skipped } = await addTransactionsBatch(
        user.uid,
        phase.pipeline.classified,
      );

      // 2. Seed pending-review queue for every unique unknown merchant.
      //    We need to fetch the newly written transaction IDs to populate
      //    pendingTransactionIds on each PendingReviewItem. Since
      //    addTransactionsBatch doesn't currently return IDs, we seed the
      //    reviews with an empty pendingTransactionIds array — the HITL
      //    modal can query by pendingReviewKey when the user resolves them
      //    (Task 9). This keeps Task 8 shipping without a second pass.
      const reviewItems: Array<Omit<PendingReviewItem, 'createdAt'>> =
        Array.from(phase.pipeline.uniqueUnknownMerchants.values()).map(
          (group) => ({
            merchantKey: group.merchantKey,
            merchantRaw: group.merchantRaw,
            occurrenceCount: group.occurrences,
            firstSeen: group.firstSeen,
            lastSeen: group.lastSeen,
            pendingTransactionIds: [],
            totalAmount: group.totalAmount,
          }),
        );

      await upsertPendingReviewsBatch(user.uid, reviewItems);

      setPhase({
        kind: 'done',
        result: {
          written,
          skipped,
          reviewCount: reviewItems.length,
        },
      });
    } catch (err) {
      setPhase({
        kind: 'error',
        message:
          err instanceof Error
            ? `Commit failed: ${err.message}`
            : 'Commit failed.',
      });
    }
  }, [phase, user]);

  const handleCancel = useCallback(() => {
    setPhase({ kind: 'idle' });
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Upload a statement
            </h1>
            <p className="mt-1 text-sm text-[#A3A3A3]">
              Drop a Bank of America checking PDF. Everything stays in your
              account.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            Back
          </Button>
        </div>

        {/* Body switches on phase */}
        {phase.kind === 'idle' && (
          <PdfDropzone onFile={handleFile} />
        )}

        {phase.kind === 'parsing' && (
          <div className="rounded-xl border border-[#262626] bg-[#141414] px-6 py-12 text-center">
            <div className="mx-auto h-6 w-24 animate-pulse rounded bg-[#262626]" />
            <p className="mt-4 text-sm text-[#A3A3A3]">
              Parsing your statement…
            </p>
          </div>
        )}

        {phase.kind === 'previewing' && (
          <BankDetectorPreview
            statement={phase.statement}
            parserName={phase.parserName}
            pipeline={phase.pipeline}
            submitting={false}
            onCancel={handleCancel}
            onCommit={handleCommit}
          />
        )}

        {phase.kind === 'committing' && (
          <div className="rounded-xl border border-[#262626] bg-[#141414] px-6 py-12 text-center">
            <div className="mx-auto h-6 w-24 animate-pulse rounded bg-[#262626]" />
            <p className="mt-4 text-sm text-[#A3A3A3]">
              Saving to your account…
            </p>
          </div>
        )}

        {phase.kind === 'done' && (
          <div className="space-y-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-6 py-8 text-center">
            <div className="text-sm uppercase tracking-wide text-[#10B981]">
              Success
            </div>
            <div className="text-lg font-medium">
              Imported {phase.result.written} transactions
            </div>
            <div className="space-y-1 text-xs text-[#A3A3A3]">
              {phase.result.skipped > 0 && (
                <div>
                  {phase.result.skipped} duplicate
                  {phase.result.skipped === 1 ? '' : 's'} skipped
                </div>
              )}
              {phase.result.reviewCount > 0 && (
                <div>
                  {phase.result.reviewCount} merchant
                  {phase.result.reviewCount === 1 ? '' : 's'} waiting for
                  review
                </div>
              )}
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhase({ kind: 'idle' })}>
                Upload another
              </Button>
              <Button onClick={() => router.push('/dashboard')}>
                Go to dashboard
              </Button>
            </div>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="space-y-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-6 py-6">
            <div className="text-sm font-semibold text-[#EF4444]">
              Something went wrong
            </div>
            <p className="text-sm text-[#A3A3A3]">{phase.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase({ kind: 'idle' })}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
