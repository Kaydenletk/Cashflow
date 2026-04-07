/**
 * scripts/check-accuracy.ts
 *
 * Phase 1 checkpoint verification: classify 10 of YOUR real transactions and
 * confirm accuracy ≥ 80% before moving to Phase 2.
 *
 * USAGE:
 *   1. Edit the REAL_TRANSACTIONS array below — replace the 10 placeholder
 *      entries with 10 actual transactions from your bank/credit card.
 *   2. For each one, set `expectedBucket` to what you THINK the bucket should
 *      be (ASSET / LIABILITY / EXPENSE / INCOME). This is the ground truth.
 *   3. Run: `npm run check:accuracy`
 *   4. Read the output. If accuracy < 80%, the script tells you which
 *      merchant rules to add to lib/classification/merchant-rules.ts.
 *
 * This script is NOT a unit test — it does not run with `npm test`. It exists
 * only to satisfy the Phase 1 checkpoint in CLAUDE_CODE_PLAN.md (line 96):
 *   "npm test passes. Classify 10 of your real transactions, accuracy ≥ 80%."
 */

import { classify } from "@/lib/classification/classifier";
import { Bucket, type Bucket as BucketType, type IncomeType } from "@/lib/types/transaction";

// ─── EDIT THIS ────────────────────────────────────────────────────────────────
// Replace these 10 placeholder entries with your real transactions.
// Use the merchant name as it appears on your statement (case doesn't matter).
// `category` is optional — leave undefined if your bank doesn't categorize.

interface RealTxn {
  merchant: string;
  category?: string;
  expectedBucket: BucketType;
  expectedIncomeType?: IncomeType; // only for INCOME entries
  note?: string; // optional context for yourself
}

const REAL_TRANSACTIONS: RealTxn[] = [
  // ── Replace these 10 with your real transactions ────────────────────────
  { merchant: "VANGUARD BUY", expectedBucket: Bucket.ASSET, note: "monthly VOO purchase" },
  { merchant: "PUBLIX #1234", expectedBucket: Bucket.EXPENSE, note: "groceries" },
  { merchant: "STARBUCKS STORE 4421", expectedBucket: Bucket.EXPENSE, note: "coffee" },
  { merchant: "DIRECT DEPOSIT - ACME PAYROLL", expectedBucket: Bucket.INCOME, expectedIncomeType: "ACTIVE", note: "biweekly paycheck" },
  { merchant: "CHASE CREDIT CARD PAYMENT", expectedBucket: Bucket.LIABILITY, note: "credit card autopay" },
  { merchant: "UBER TRIP HELP.UBER.COM", expectedBucket: Bucket.EXPENSE, note: "ride home" },
  { merchant: "AMZN MKTP US*RT4XQ8", expectedBucket: Bucket.EXPENSE, note: "amazon order" },
  { merchant: "ROBINHOOD CRYPTO", expectedBucket: Bucket.ASSET, note: "BTC buy" },
  { merchant: "TAMPA ELECTRIC", expectedBucket: Bucket.EXPENSE, note: "utility bill" },
  { merchant: "NELNET STUDENT LOAN", expectedBucket: Bucket.LIABILITY, note: "monthly student loan payment" },
];

// ─── DON'T EDIT BELOW ─────────────────────────────────────────────────────────

const ACCURACY_THRESHOLD = 0.8;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function bucketColor(bucket: BucketType): string {
  switch (bucket) {
    case "ASSET":
      return c.green;
    case "LIABILITY":
      return c.red;
    case "EXPENSE":
      return c.yellow;
    case "INCOME":
      return c.blue;
    default:
      return c.dim;
  }
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + "…";
  return s + " ".repeat(n - s.length);
}

console.log(`\n${c.bold}╭─ Phase 1 Classifier Accuracy Check ─────────────────────────────────╮${c.reset}`);
console.log(`${c.bold}│${c.reset} Checkpoint: ≥${(ACCURACY_THRESHOLD * 100).toFixed(0)}% accuracy on ${REAL_TRANSACTIONS.length} real transactions ${" ".repeat(20)}${c.bold}│${c.reset}`);
console.log(`${c.bold}╰─────────────────────────────────────────────────────────────────────╯${c.reset}\n`);

interface Result {
  txn: RealTxn;
  gotBucket: BucketType;
  gotConfidence: number;
  gotMatchedRule: string | undefined;
  bucketCorrect: boolean;
  incomeTypeCorrect: boolean;
}

const results: Result[] = REAL_TRANSACTIONS.map((txn) => {
  const out = classify({ merchant: txn.merchant, category: txn.category });
  const bucketCorrect = out.bucket === txn.expectedBucket;
  const incomeTypeCorrect =
    txn.expectedIncomeType === undefined ? true : out.incomeType === txn.expectedIncomeType;
  return {
    txn,
    gotBucket: out.bucket,
    gotConfidence: out.confidence,
    gotMatchedRule: out.matchedRule,
    bucketCorrect,
    incomeTypeCorrect,
  };
});

// ─── Print table ──────────────────────────────────────────────────────────────

console.log(
  `${c.bold}${pad("Merchant", 32)} ${pad("Expected", 11)} ${pad("Got", 11)} ${pad("Conf", 6)} ${pad("Rule", 22)}${c.reset}`,
);
console.log(c.dim + "─".repeat(85) + c.reset);

for (const r of results) {
  const expected = bucketColor(r.txn.expectedBucket) + pad(r.txn.expectedBucket, 11) + c.reset;
  const got = bucketColor(r.gotBucket) + pad(r.gotBucket, 11) + c.reset;
  const mark = r.bucketCorrect && r.incomeTypeCorrect ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  const merchant = pad(r.txn.merchant, 32);
  const conf = pad(r.gotConfidence.toFixed(2), 6);
  const rule = pad(r.gotMatchedRule ?? "—", 22);
  console.log(`${mark} ${merchant} ${expected} ${got} ${conf} ${c.dim}${rule}${c.reset}`);
}

// ─── Compute accuracy ─────────────────────────────────────────────────────────

const correct = results.filter((r) => r.bucketCorrect && r.incomeTypeCorrect).length;
const total = results.length;
const accuracy = correct / total;
const passing = accuracy >= ACCURACY_THRESHOLD;

console.log(c.dim + "─".repeat(85) + c.reset);
const accuracyColor = passing ? c.green : c.red;
console.log(
  `\n${c.bold}Accuracy:${c.reset} ${accuracyColor}${(accuracy * 100).toFixed(0)}% (${correct}/${total})${c.reset}` +
    `   ${passing ? c.green + "✓ checkpoint met" : c.red + "✗ below 80% threshold"}${c.reset}`,
);

// ─── Misses + suggestions ─────────────────────────────────────────────────────

const misses = results.filter((r) => !r.bucketCorrect || !r.incomeTypeCorrect);

if (misses.length > 0) {
  console.log(`\n${c.bold}${c.yellow}⚠ ${misses.length} miss${misses.length === 1 ? "" : "es"} — suggested fixes:${c.reset}\n`);

  for (const r of misses) {
    const wasFallback = r.gotMatchedRule === "fallback-default";
    console.log(`  ${c.bold}${r.txn.merchant}${c.reset}`);
    console.log(
      `    expected ${bucketColor(r.txn.expectedBucket)}${r.txn.expectedBucket}${c.reset}, got ${bucketColor(r.gotBucket)}${r.gotBucket}${c.reset} (rule: ${c.dim}${r.gotMatchedRule}${c.reset})`,
    );

    if (wasFallback) {
      // No rule matched at all → suggest adding a merchant rule
      const pattern = r.txn.merchant.toLowerCase().split(/\s+|[#*]/)[0]?.trim() ?? r.txn.merchant.toLowerCase();
      console.log(
        `    ${c.cyan}→ Add to lib/classification/merchant-rules.ts:${c.reset}`,
      );
      console.log(
        `      ${c.dim}{ pattern: "${pattern}", bucket: Bucket.${r.txn.expectedBucket}, label: "${pattern}", confidence: 0.95 },${c.reset}`,
      );
    } else {
      // A rule matched but gave the wrong bucket → existing rule is wrong or too broad
      console.log(
        `    ${c.cyan}→ Existing rule "${r.gotMatchedRule}" is too broad or in the wrong bucket.${c.reset}`,
      );
      console.log(
        `      ${c.dim}Find it in lib/classification/merchant-rules.ts and either:${c.reset}`,
      );
      console.log(
        `      ${c.dim}  (a) tighten its pattern so it doesn't match "${r.txn.merchant}", OR${c.reset}`,
      );
      console.log(
        `      ${c.dim}  (b) add a more specific rule ABOVE it (first match wins).${c.reset}`,
      );
    }
    console.log("");
  }
} else {
  console.log(`\n${c.green}${c.bold}🎉 All 10 transactions classified correctly. Phase 1 checkpoint complete.${c.reset}\n`);
}

// ─── Exit ─────────────────────────────────────────────────────────────────────

process.exit(passing ? 0 : 1);
