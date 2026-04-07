/**
 * seeds/transactions.ts
 *
 * 30 realistic Tampa-life transactions for development seeding.
 * All records are pre-classified — bucket/classifiedBy/confidence match
 * what the classifier would produce.
 *
 * NOTE: `userId` is intentionally omitted — the seed runner (Phase 2) will
 * inject the authenticated user's ID when inserting into the database.
 *
 * Dates are spread across the last 30 days relative to 2026-04-07.
 */

import { Bucket, ClassifiedBy, IncomeType, Mood } from "@/lib/types/transaction";

export interface SeedTransaction {
  amount: number; // stored as Decimal(12,2) in schema; number here for seed convenience
  merchant: string;
  category?: string;
  bucket: Bucket;
  incomeType?: IncomeType;
  classifiedBy: ClassifiedBy;
  confidence: number;
  date: Date;
  mood?: Mood;
  note?: string;
}

// Helper: subtract days from a reference date
function daysAgo(days: number): Date {
  const d = new Date("2026-04-07T12:00:00.000Z");
  d.setDate(d.getDate() - days);
  return d;
}

export const seedTransactions: SeedTransaction[] = [
  // ─── Day 1 ago ───────────────────────────────────────────────────────────
  {
    amount: 2240.0,
    merchant: "Direct Deposit - Employer",
    category: "salary",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(1),
    mood: Mood.HAPPY,
    note: "Biweekly paycheck from work",
  },
  {
    amount: 6.75,
    merchant: "Starbucks Store #9042 Tampa",
    category: "dining",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(1),
    mood: Mood.NEUTRAL,
    note: "Morning cold brew before work",
  },

  // ─── Day 2 ago ───────────────────────────────────────────────────────────
  {
    amount: 200.0,
    merchant: "Vanguard Brokerage",
    category: "investments",
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(2),
    mood: Mood.HAPPY,
    note: "Monthly VOO contribution",
  },
  {
    amount: 63.42,
    merchant: "Publix Super Market #0234",
    category: "groceries",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(2),
    mood: Mood.NEUTRAL,
  },

  // ─── Day 4 ago ───────────────────────────────────────────────────────────
  {
    amount: 1850.0,
    merchant: "Greystar Apartment Communities",
    category: "rent",
    bucket: Bucket.LIABILITY,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(4),
    mood: Mood.REGRET,
    note: "Monthly rent — South Tampa apartment",
  },
  {
    amount: 14.99,
    merchant: "Netflix",
    category: "subscriptions",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(4),
    mood: Mood.NEUTRAL,
  },

  // ─── Day 5 ago ───────────────────────────────────────────────────────────
  {
    amount: 38.14,
    merchant: "Wawa #5132 Tampa FL",
    category: "gas",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(5),
    mood: Mood.NEUTRAL,
    note: "Gas fill-up",
  },
  {
    amount: 9.99,
    merchant: "Spotify USA",
    category: "subscriptions",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(5),
    mood: Mood.NEUTRAL,
  },

  // ─── Day 6 ago ───────────────────────────────────────────────────────────
  {
    amount: 47.80,
    merchant: "Amazon.com",
    category: "shopping",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(6),
    mood: Mood.REGRET,
    note: "Impulse buy — keyboard stand",
  },
  {
    amount: 18.60,
    merchant: "Uber",
    category: "travel",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(6),
    mood: Mood.NEUTRAL,
    note: "Ride to Channelside",
  },

  // ─── Day 8 ago ───────────────────────────────────────────────────────────
  {
    amount: 150.0,
    merchant: "Robinhood",
    category: "investments",
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(8),
    mood: Mood.HAPPY,
    note: "Bought SCHB",
  },
  {
    amount: 54.20,
    merchant: "Datz Restaurant Tampa",
    category: "dining",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(8),
    mood: Mood.HAPPY,
    note: "Lunch with friends — worth it",
  },

  // ─── Day 10 ago ──────────────────────────────────────────────────────────
  {
    amount: 124.50,
    merchant: "CHASE PAYMENT",
    category: "credit card payment",
    bucket: Bucket.LIABILITY,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(10),
    mood: Mood.REGRET,
    note: "Minimum payment on Chase Sapphire",
  },
  {
    amount: 79.14,
    merchant: "Publix Super Market #0512",
    category: "groceries",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(10),
    mood: Mood.NEUTRAL,
    note: "Weekly grocery run",
  },

  // ─── Day 12 ago ──────────────────────────────────────────────────────────
  {
    amount: 2240.0,
    merchant: "Direct Deposit - Employer",
    category: "salary",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(12),
    mood: Mood.HAPPY,
    note: "Biweekly paycheck",
  },
  {
    amount: 143.00,
    merchant: "MOHELA",
    category: "loan payment",
    bucket: Bucket.LIABILITY,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(12),
    mood: Mood.REGRET,
    note: "Student loan payment",
  },

  // ─── Day 14 ago ──────────────────────────────────────────────────────────
  {
    amount: 500.0,
    merchant: "Fidelity Investments",
    category: "investments",
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(14),
    mood: Mood.HAPPY,
    note: "Roth IRA contribution",
  },
  {
    amount: 112.40,
    merchant: "Tampa Electric",
    category: "utilities",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(14),
    mood: Mood.NEUTRAL,
    note: "Monthly electric bill",
  },

  // ─── Day 16 ago ──────────────────────────────────────────────────────────
  {
    amount: 48.00,
    merchant: "La Fitness - South Tampa",
    category: "fitness",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(16),
    mood: Mood.HAPPY,
    note: "Monthly gym membership",
  },
  {
    amount: 22.50,
    merchant: "Rooster & The Till Tampa",
    category: "dining",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(16),
    mood: Mood.HAPPY,
    note: "Brunch — worth every penny",
  },

  // ─── Day 18 ago ──────────────────────────────────────────────────────────
  {
    amount: 12.35,
    merchant: "Dividend Reinvestment VOO",
    category: "dividends",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(18),
    mood: Mood.HAPPY,
    note: "Quarterly VOO dividend",
  },
  {
    amount: 94.99,
    merchant: "T-Mobile",
    category: "utilities",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(18),
    mood: Mood.NEUTRAL,
    note: "Monthly phone bill",
  },

  // ─── Day 20 ago ──────────────────────────────────────────────────────────
  {
    amount: 300.0,
    merchant: "Coinbase",
    category: "investments",
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(20),
    mood: Mood.NEUTRAL,
    note: "Bitcoin DCA",
  },
  {
    amount: 35.70,
    merchant: "Chipotle Mexican Grill",
    category: "dining",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(20),
    mood: Mood.NEUTRAL,
    note: "Lunch x2 (meal prepped the rest of week)",
  },

  // ─── Day 22 ago ──────────────────────────────────────────────────────────
  {
    amount: 3.95,
    merchant: "Interest Earned",
    category: "interest",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(22),
    mood: Mood.HAPPY,
    note: "HYSA interest",
  },
  {
    amount: 58.90,
    merchant: "Amazon.com",
    category: "shopping",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(22),
    mood: Mood.NEUTRAL,
    note: "Home office supplies",
  },

  // ─── Day 25 ago ──────────────────────────────────────────────────────────
  {
    amount: 250.0,
    merchant: "Charles Schwab",
    category: "investments",
    bucket: Bucket.ASSET,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(25),
    mood: Mood.HAPPY,
    note: "Taxable brokerage top-up",
  },
  {
    amount: 7.22,
    merchant: "Wawa #5211 Tampa FL",
    category: "dining",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(25),
    mood: Mood.NEUTRAL,
    note: "Coffee and breakfast sandwich",
  },

  // ─── Day 28 ago ──────────────────────────────────────────────────────────
  {
    amount: 76.48,
    merchant: "Lyft",
    category: "travel",
    bucket: Bucket.EXPENSE,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(28),
    mood: Mood.NEUTRAL,
    note: "Rides during the weekend — no parking on Davis Islands",
  },
  {
    amount: 100.0,
    merchant: "Nelnet",
    category: "loan payment",
    bucket: Bucket.LIABILITY,
    classifiedBy: ClassifiedBy.RULE,
    confidence: 0.95,
    date: daysAgo(28),
    mood: Mood.REGRET,
    note: "Extra student loan principal payment",
  },
];
