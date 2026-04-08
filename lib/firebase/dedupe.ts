/**
 * lib/firebase/dedupe.ts
 *
 * Content hashing for idempotent PDF re-imports.
 *
 * The dedupe hash is a deterministic function of (date, amount, merchant_raw).
 * When the user uploads the same statement twice — intentionally or by
 * mistake — the commit flow queries Firestore for existing hashes and
 * skips duplicates. This protects against double-counting and makes
 * re-imports a safe, repeatable operation.
 *
 * Normalization rules (match across whitespace and case variations):
 *   - Date  → YYYY-MM-DD (UTC)
 *   - Amount → signed integer cents (round-half-up)
 *   - Merchant → lowercase, collapse internal whitespace, trim
 *
 * We use Web Crypto SubtleCrypto (SHA-256) which is available in Node 20+
 * and in the Next.js Edge runtime. No third-party crypto library needed.
 */

/**
 * Hash a full transaction row for dedupe comparison.
 * Returns a 64-char lowercase hex string (SHA-256).
 */
export async function hashTransaction(
  date: Date,
  amount: number,
  merchantRaw: string,
): Promise<string> {
  const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
  // Round to cents first, then signed-integer string. This neutralizes
  // the classic 0.1 + 0.2 === 0.30000000000000004 floating point drift.
  const cents = Math.round(amount * 100).toString();
  const merchantKey = normalizeMerchant(merchantRaw);
  const payload = `${dateKey}|${cents}|${merchantKey}`;
  return sha256Hex(payload);
}

/**
 * Hash a merchant string to produce a stable key usable as a Firestore
 * doc ID for the `pending_reviews` collection. The truncation to 120
 * chars bounds key length so two merchants whose first 120 normalized
 * chars match will collapse into one review row.
 */
export async function hashMerchantKey(merchantRaw: string): Promise<string> {
  const normalized = normalizeMerchant(merchantRaw).slice(0, 120);
  return sha256Hex(normalized);
}

// ─── Internals ───────────────────────────────────────────────────────────────

function normalizeMerchant(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
