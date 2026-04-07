/**
 * components/add-transaction-modal.tsx
 *
 * The Add Transaction modal. Implements:
 *   - amount, merchant, date inputs
 *   - live classification preview (debounced merchant)
 *   - 4 colored override buttons
 *   - LIABILITY FRICTION: 10+ char reason required to enable Save
 *   - mood emoji selector
 *   - optional note
 *
 * On save: addTransaction() → close modal. The onSnapshot subscription in
 * useTransactions() takes care of UI refresh (no manual cache invalidation).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BucketBadge } from '@/components/bucket-badge';
import { addTransaction } from '@/lib/firebase/transactions';
import { classify } from '@/lib/classification/classifier';
import { Bucket, Mood } from '@/lib/types/transaction';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_LIABILITY_REASON = 10;

const BUCKET_BUTTON_STYLE: Record<Bucket, string> = {
  ASSET: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300',
  LIABILITY: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300',
  EXPENSE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300',
  INCOME: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300',
};

const MOOD_EMOJI: Record<Mood, string> = {
  HAPPY: '😊',
  NEUTRAL: '😐',
  REGRET: '😞',
};

export function AddTransactionModal({ open, onOpenChange }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bucketOverride, setBucketOverride] = useState<Bucket | null>(null);
  const [liabilityReason, setLiabilityReason] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAmount('');
      setMerchant('');
      setDate(new Date().toISOString().slice(0, 10));
      setBucketOverride(null);
      setLiabilityReason('');
      setMood(null);
      setNote('');
      setError(null);
    }
  }, [open]);

  // Live classification preview (no debounce — classifier is local + cheap)
  const preview = useMemo(() => {
    if (!merchant.trim()) return null;
    return classify({ merchant });
  }, [merchant]);

  const finalBucket: Bucket | null = bucketOverride ?? preview?.bucket ?? null;
  const isLiability = finalBucket === Bucket.LIABILITY;
  const reasonValid = !isLiability || liabilityReason.trim().length >= MIN_LIABILITY_REASON;
  const canSave =
    !submitting &&
    !!amount &&
    Number(amount) > 0 &&
    merchant.trim().length > 0 &&
    !!finalBucket &&
    reasonValid;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await addTransaction({
        amount: Number(amount),
        merchant: merchant.trim(),
        date: new Date(`${date}T12:00:00`),
        bucketOverride: bucketOverride ?? undefined,
        liabilityReason: isLiability ? liabilityReason.trim() : undefined,
        mood: mood ?? undefined,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Be honest with future-you. Override the auto-classification if it's wrong.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Merchant */}
          <div>
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Vanguard, Starbucks, Publix…"
            />
            {preview && !bucketOverride && (
              <div className="mt-2">
                <BucketBadge bucket={preview.bucket} confidence={preview.confidence} />
                <span className="ml-2 text-xs text-muted-foreground">auto-classified</span>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Override buttons */}
          <div>
            <Label>Override</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.keys(BUCKET_BUTTON_STYLE) as Bucket[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBucketOverride(bucketOverride === b ? null : b)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition',
                    BUCKET_BUTTON_STYLE[b],
                    bucketOverride === b && 'ring-2 ring-foreground/40',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Liability friction */}
          {isLiability && (
            <div>
              <Label htmlFor="liability-reason">
                Why are you spending this?{' '}
                <span className="font-normal text-muted-foreground">
                  ({liabilityReason.trim().length}/{MIN_LIABILITY_REASON} chars)
                </span>
              </Label>
              <Textarea
                id="liability-reason"
                value={liabilityReason}
                onChange={(e) => setLiabilityReason(e.target.value)}
                placeholder="Be honest with future-you."
                rows={3}
              />
            </div>
          )}

          {/* Mood */}
          <div>
            <Label>Mood (optional)</Label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(MOOD_EMOJI) as Mood[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? null : m)}
                  className={cn(
                    'rounded-md border px-4 py-2 text-2xl transition',
                    mood === m && 'ring-2 ring-foreground/40',
                  )}
                  aria-label={m}
                >
                  {MOOD_EMOJI[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder=""
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
