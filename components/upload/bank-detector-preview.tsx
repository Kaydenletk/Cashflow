/**
 * components/upload/bank-detector-preview.tsx
 *
 * After a PDF has been parsed successfully, we show this card with:
 *   - Detected bank + parser name
 *   - Statement period (formatted human-readable)
 *   - Row count + per-section breakdown
 *   - Pipeline summary: "N auto-categorized · M need review"
 *   - Checksum warnings, if any (non-blocking, user can still commit)
 *   - Expandable list of the first few parsed transactions
 *   - Cancel / Import buttons
 *
 * The parent page handles the actual commit; this component emits
 * onCancel / onCommit and doesn't touch Firestore directly.
 */

'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineOutput } from '@/lib/classification/pipeline';
import type { ParsedStatement } from '@/lib/parsers/types';

// Match JSON representation of ParsedStatement (dates come back as strings
// over the wire). We hydrate dates at the page level before passing in here.
interface BankDetectorPreviewProps {
  statement: ParsedStatement;
  parserName: string;
  pipeline: PipelineOutput;
  submitting: boolean;
  onCancel: () => void;
  onCommit: () => void;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', DATE_FORMAT);
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'auto',
  });
}

export function BankDetectorPreview({
  statement,
  parserName,
  pipeline,
  submitting,
  onCancel,
  onCommit,
}: BankDetectorPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const sectionCounts = {
    deposits: statement.transactions.filter((t) => t.section === 'deposits').length,
    cardSubtractions: statement.transactions.filter(
      (t) => t.section === 'card_subtractions',
    ).length,
    otherSubtractions: statement.transactions.filter(
      (t) => t.section === 'other_subtractions',
    ).length,
  };

  const hasChecksumDrift =
    statement.checksumDelta.deposits > 0.01 ||
    statement.checksumDelta.cardSubtractions > 0.01 ||
    statement.checksumDelta.otherSubtractions > 0.01;

  return (
    <Card className="bg-[#141414] text-[#FAFAFA] ring-1 ring-[#262626]">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Statement preview
          </CardTitle>
          <Badge variant="outline" className="border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
            {parserName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-5 text-sm">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[#A3A3A3]">
          <div>
            <div className="text-xs uppercase tracking-wide text-[#525252]">
              Period
            </div>
            <div className="text-[#FAFAFA]">
              {formatDate(statement.periodStart)} – {formatDate(statement.periodEnd)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-[#525252]">
              Account
            </div>
            <div className="font-mono text-[#FAFAFA]">
              {statement.accountNumberMasked}
            </div>
          </div>
        </div>

        {/* Row counts */}
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-[#0A0A0A] p-4 ring-1 ring-[#262626]">
          <Stat label="Deposits" value={sectionCounts.deposits} />
          <Stat label="Card debits" value={sectionCounts.cardSubtractions} />
          <Stat label="Other" value={sectionCounts.otherSubtractions} />
        </div>

        {/* Pipeline summary */}
        <div className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#0A0A0A] px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-[#525252]">
              After classification
            </div>
            <div className="text-sm text-[#FAFAFA]">
              <span className="font-semibold text-[#10B981]">
                {pipeline.autoCount} auto-categorized
              </span>
              {' · '}
              <span
                className={
                  pipeline.reviewCount > 0
                    ? 'font-semibold text-[#F59E0B]'
                    : 'text-[#A3A3A3]'
                }
              >
                {pipeline.reviewCount} need review
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[#525252]">
              Total
            </div>
            <div className="font-mono text-[#FAFAFA]">
              {statement.transactions.length} rows
            </div>
          </div>
        </div>

        {/* Checksum warnings */}
        {(hasChecksumDrift || statement.warnings.length > 0) && (
          <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">
              Warnings
            </div>
            {hasChecksumDrift && (
              <div className="text-xs text-[#A3A3A3]">
                Parsed totals differ from statement totals by more than a cent.
                Some rows may be missing.
              </div>
            )}
            {statement.warnings.map((w, i) => (
              <div key={i} className="text-xs text-[#A3A3A3]">
                · {w}
              </div>
            ))}
          </div>
        )}

        {/* First 5 rows (expandable) */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[#525252] hover:text-[#A3A3A3]"
          >
            {expanded ? '▾ Hide sample rows' : '▸ Show sample rows'}
          </button>
          {expanded && (
            <div className="space-y-1 rounded-lg bg-[#0A0A0A] p-3 font-mono text-xs ring-1 ring-[#262626]">
              {statement.transactions.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <div className="truncate text-[#A3A3A3]">
                    <span className="text-[#525252]">
                      {t.date.toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>{' '}
                    {t.merchantRaw.length > 60
                      ? t.merchantRaw.slice(0, 60) + '…'
                      : t.merchantRaw}
                  </div>
                  <div
                    className={
                      t.amount >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }
                  >
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <div className="flex justify-end gap-2 border-t border-[#262626] px-5 pt-3">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button onClick={onCommit} disabled={submitting}>
          {submitting ? 'Importing…' : 'Import'}
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#525252]">
        {label}
      </div>
      <div className="font-mono text-xl text-[#FAFAFA]">{value}</div>
    </div>
  );
}
