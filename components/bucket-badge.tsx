/**
 * components/bucket-badge.tsx
 *
 * Small colored badge that shows a transaction bucket plus optional confidence.
 * Used by TransactionRow, AddTransactionModal preview, and override buttons.
 *
 * Color mapping (matches the spec §6.3):
 *   ASSET     → green
 *   LIABILITY → red
 *   EXPENSE   → yellow
 *   INCOME    → blue
 */

import { Badge } from '@/components/ui/badge';
import { Bucket } from '@/lib/types/transaction';
import { cn } from '@/lib/utils';

const COLOR: Record<Bucket, string> = {
  ASSET: 'bg-green-100 text-green-800 border-green-300',
  LIABILITY: 'bg-red-100 text-red-800 border-red-300',
  EXPENSE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  INCOME: 'bg-blue-100 text-blue-800 border-blue-300',
};

interface Props {
  bucket: Bucket;
  /** Optional 0–1 confidence — when present, renders a faint suffix like "· 95%" */
  confidence?: number;
  className?: string;
}

export function BucketBadge({ bucket, confidence, className }: Props) {
  return (
    <Badge variant="outline" className={cn(COLOR[bucket], 'font-medium', className)}>
      {bucket}
      {confidence !== undefined && (
        <span className="ml-1 opacity-60">· {Math.round(confidence * 100)}%</span>
      )}
    </Badge>
  );
}
