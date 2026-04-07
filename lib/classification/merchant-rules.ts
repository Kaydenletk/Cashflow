import { Bucket, IncomeType } from "@/lib/types/transaction";

export interface MerchantRule {
  /** Lowercase substring to match against the merchant string (case-insensitive). */
  pattern: string;
  bucket: Bucket;
  /** Only populated when bucket === INCOME. */
  incomeType?: IncomeType;
  /** Human-readable label used as matchedRule in ClassificationResult. */
  label: string;
  /** Confidence for merchant-rule matches is always 0.95 (high). */
  confidence: 0.95;
}

/**
 * Ordered merchant rules — first match wins.
 * Minimum 40 entries covering all 4 buckets, with realistic Tampa-life examples.
 */
export const MERCHANT_RULES: MerchantRule[] = [
  // ─── INCOME: Active (payroll / direct deposit) ───────────────────────────
  // More-specific patterns come before the generic "payroll" catch-all.
  {
    pattern: "direct deposit",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "direct-deposit",
    confidence: 0.95,
  },
  {
    pattern: "adp",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "adp-payroll",
    confidence: 0.95,
  },
  {
    pattern: "gusto",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "gusto-payroll",
    confidence: 0.95,
  },
  {
    pattern: "zelle from",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "zelle-transfer-in",
    confidence: 0.95,
  },
  {
    pattern: "payroll",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.ACTIVE,
    label: "payroll",
    confidence: 0.95,
  },

  // ─── INCOME: Passive (dividends / interest) ──────────────────────────────
  {
    pattern: "dividend",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "dividend",
    confidence: 0.95,
  },
  {
    pattern: "interest earned",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "interest-earned",
    confidence: 0.95,
  },
  {
    pattern: "interest payment",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "interest-payment",
    confidence: 0.95,
  },
  {
    pattern: "rental income",
    bucket: Bucket.INCOME,
    incomeType: IncomeType.PASSIVE,
    label: "rental-income",
    confidence: 0.95,
  },

  // ─── ASSET: Brokerage / Investment platforms ─────────────────────────────
  {
    pattern: "vanguard",
    bucket: Bucket.ASSET,
    label: "vanguard",
    confidence: 0.95,
  },
  {
    pattern: "fidelity",
    bucket: Bucket.ASSET,
    label: "fidelity",
    confidence: 0.95,
  },
  {
    pattern: "robinhood",
    bucket: Bucket.ASSET,
    label: "robinhood",
    confidence: 0.95,
  },
  {
    pattern: "schwab",
    bucket: Bucket.ASSET,
    label: "charles-schwab",
    confidence: 0.95,
  },
  {
    pattern: "coinbase",
    bucket: Bucket.ASSET,
    label: "coinbase",
    confidence: 0.95,
  },
  {
    pattern: "betterment",
    bucket: Bucket.ASSET,
    label: "betterment",
    confidence: 0.95,
  },
  {
    pattern: "acorns",
    bucket: Bucket.ASSET,
    label: "acorns",
    confidence: 0.95,
  },
  {
    pattern: "wealthfront",
    bucket: Bucket.ASSET,
    label: "wealthfront",
    confidence: 0.95,
  },
  {
    pattern: "etrade",
    bucket: Bucket.ASSET,
    label: "etrade",
    confidence: 0.95,
  },
  {
    pattern: "public.com",
    bucket: Bucket.ASSET,
    label: "public-investing",
    confidence: 0.95,
  },
  {
    pattern: "sofi invest",
    bucket: Bucket.ASSET,
    label: "sofi-invest",
    confidence: 0.95,
  },

  // ─── LIABILITY: Credit card payments ─────────────────────────────────────
  {
    pattern: "chase payment",
    bucket: Bucket.LIABILITY,
    label: "chase-card-payment",
    confidence: 0.95,
  },
  {
    pattern: "amex payment",
    bucket: Bucket.LIABILITY,
    label: "amex-card-payment",
    confidence: 0.95,
  },
  {
    pattern: "american express payment",
    bucket: Bucket.LIABILITY,
    label: "amex-card-payment",
    confidence: 0.95,
  },
  {
    pattern: "apple card payment",
    bucket: Bucket.LIABILITY,
    label: "apple-card-payment",
    confidence: 0.95,
  },
  {
    pattern: "discover payment",
    bucket: Bucket.LIABILITY,
    label: "discover-card-payment",
    confidence: 0.95,
  },
  {
    pattern: "capital one payment",
    bucket: Bucket.LIABILITY,
    label: "capital-one-payment",
    confidence: 0.95,
  },
  {
    pattern: "citi payment",
    bucket: Bucket.LIABILITY,
    label: "citi-card-payment",
    confidence: 0.95,
  },

  // ─── LIABILITY: Loans ─────────────────────────────────────────────────────
  {
    pattern: "nelnet",
    bucket: Bucket.LIABILITY,
    label: "nelnet-student-loan",
    confidence: 0.95,
  },
  {
    pattern: "mohela",
    bucket: Bucket.LIABILITY,
    label: "mohela-student-loan",
    confidence: 0.95,
  },
  {
    pattern: "navient",
    bucket: Bucket.LIABILITY,
    label: "navient-student-loan",
    confidence: 0.95,
  },
  {
    pattern: "great lakes",
    bucket: Bucket.LIABILITY,
    label: "great-lakes-student-loan",
    confidence: 0.95,
  },

  // ─── LIABILITY: Rent / Mortgage ───────────────────────────────────────────
  {
    pattern: "rent payment",
    bucket: Bucket.LIABILITY,
    label: "rent-payment",
    confidence: 0.95,
  },
  {
    pattern: "mortgage payment",
    bucket: Bucket.LIABILITY,
    label: "mortgage-payment",
    confidence: 0.95,
  },
  {
    pattern: "apartment",
    bucket: Bucket.LIABILITY,
    label: "apartment-rent",
    confidence: 0.95,
  },
  {
    pattern: "greystar",
    bucket: Bucket.LIABILITY,
    label: "greystar-apartments",
    confidence: 0.95,
  },

  // ─── EXPENSE: Groceries / Food ───────────────────────────────────────────
  {
    pattern: "publix",
    bucket: Bucket.EXPENSE,
    label: "publix",
    confidence: 0.95,
  },
  {
    pattern: "wawa",
    bucket: Bucket.EXPENSE,
    label: "wawa",
    confidence: 0.95,
  },
  {
    pattern: "whole foods",
    bucket: Bucket.EXPENSE,
    label: "whole-foods",
    confidence: 0.95,
  },
  {
    pattern: "trader joe",
    bucket: Bucket.EXPENSE,
    label: "trader-joes",
    confidence: 0.95,
  },
  {
    pattern: "aldi",
    bucket: Bucket.EXPENSE,
    label: "aldi",
    confidence: 0.95,
  },

  // ─── EXPENSE: Restaurants / Tampa local ──────────────────────────────────
  {
    pattern: "starbucks",
    bucket: Bucket.EXPENSE,
    label: "starbucks",
    confidence: 0.95,
  },
  {
    pattern: "datz",
    bucket: Bucket.EXPENSE,
    label: "datz-tampa",
    confidence: 0.95,
  },
  {
    pattern: "rooster",
    bucket: Bucket.EXPENSE,
    label: "rooster-and-the-till",
    confidence: 0.95,
  },
  {
    pattern: "ciccio",
    bucket: Bucket.EXPENSE,
    label: "ciccio-restaurant-group",
    confidence: 0.95,
  },
  {
    pattern: "bdubs",
    bucket: Bucket.EXPENSE,
    label: "buffalo-wild-wings",
    confidence: 0.95,
  },
  {
    pattern: "buffalo wild wings",
    bucket: Bucket.EXPENSE,
    label: "buffalo-wild-wings",
    confidence: 0.95,
  },
  {
    pattern: "chipotle",
    bucket: Bucket.EXPENSE,
    label: "chipotle",
    confidence: 0.95,
  },
  {
    pattern: "chick-fil-a",
    bucket: Bucket.EXPENSE,
    label: "chick-fil-a",
    confidence: 0.95,
  },
  {
    pattern: "mcdonald",
    bucket: Bucket.EXPENSE,
    label: "mcdonalds",
    confidence: 0.95,
  },

  // ─── EXPENSE: Delivery / Ride-share ──────────────────────────────────────
  {
    pattern: "uber",
    bucket: Bucket.EXPENSE,
    label: "uber",
    confidence: 0.95,
  },
  {
    pattern: "lyft",
    bucket: Bucket.EXPENSE,
    label: "lyft",
    confidence: 0.95,
  },
  {
    pattern: "doordash",
    bucket: Bucket.EXPENSE,
    label: "doordash",
    confidence: 0.95,
  },
  {
    pattern: "grubhub",
    bucket: Bucket.EXPENSE,
    label: "grubhub",
    confidence: 0.95,
  },
  {
    pattern: "instacart",
    bucket: Bucket.EXPENSE,
    label: "instacart",
    confidence: 0.95,
  },

  // ─── EXPENSE: Shopping / E-commerce ──────────────────────────────────────
  {
    pattern: "amazon",
    bucket: Bucket.EXPENSE,
    label: "amazon",
    confidence: 0.95,
  },
  {
    pattern: "target",
    bucket: Bucket.EXPENSE,
    label: "target",
    confidence: 0.95,
  },
  {
    pattern: "walmart",
    bucket: Bucket.EXPENSE,
    label: "walmart",
    confidence: 0.95,
  },
  {
    pattern: "best buy",
    bucket: Bucket.EXPENSE,
    label: "best-buy",
    confidence: 0.95,
  },

  // ─── EXPENSE: Subscriptions / Streaming ──────────────────────────────────
  {
    pattern: "netflix",
    bucket: Bucket.EXPENSE,
    label: "netflix",
    confidence: 0.95,
  },
  {
    pattern: "spotify",
    bucket: Bucket.EXPENSE,
    label: "spotify",
    confidence: 0.95,
  },
  {
    pattern: "hulu",
    bucket: Bucket.EXPENSE,
    label: "hulu",
    confidence: 0.95,
  },
  {
    pattern: "disney+",
    bucket: Bucket.EXPENSE,
    label: "disney-plus",
    confidence: 0.95,
  },
  {
    pattern: "apple.com/bill",
    bucket: Bucket.EXPENSE,
    label: "apple-subscription",
    confidence: 0.95,
  },
  {
    pattern: "youtube premium",
    bucket: Bucket.EXPENSE,
    label: "youtube-premium",
    confidence: 0.95,
  },
  {
    pattern: "chatgpt",
    bucket: Bucket.EXPENSE,
    label: "chatgpt-subscription",
    confidence: 0.95,
  },

  // ─── EXPENSE: Utilities / Phone ───────────────────────────────────────────
  {
    pattern: "verizon",
    bucket: Bucket.EXPENSE,
    label: "verizon",
    confidence: 0.95,
  },
  {
    pattern: "t-mobile",
    bucket: Bucket.EXPENSE,
    label: "t-mobile",
    confidence: 0.95,
  },
  {
    pattern: "at&t",
    bucket: Bucket.EXPENSE,
    label: "att",
    confidence: 0.95,
  },
  {
    pattern: "florida power & light",
    bucket: Bucket.EXPENSE,
    label: "florida-power-and-light",
    confidence: 0.95,
  },
  {
    pattern: "fpl",
    bucket: Bucket.EXPENSE,
    label: "fpl-electric",
    confidence: 0.95,
  },
  {
    pattern: "duke energy",
    bucket: Bucket.EXPENSE,
    label: "duke-energy",
    confidence: 0.95,
  },
  {
    pattern: "tampa electric",
    bucket: Bucket.EXPENSE,
    label: "teco-electric",
    confidence: 0.95,
  },
  {
    pattern: "spectrum",
    bucket: Bucket.EXPENSE,
    label: "spectrum-internet",
    confidence: 0.95,
  },
  {
    pattern: "xfinity",
    bucket: Bucket.EXPENSE,
    label: "xfinity-internet",
    confidence: 0.95,
  },

  // ─── EXPENSE: Fitness / Tampa gyms ───────────────────────────────────────
  {
    pattern: "la fitness",
    bucket: Bucket.EXPENSE,
    label: "la-fitness",
    confidence: 0.95,
  },
  {
    pattern: "planet fitness",
    bucket: Bucket.EXPENSE,
    label: "planet-fitness",
    confidence: 0.95,
  },
  {
    pattern: "anytime fitness",
    bucket: Bucket.EXPENSE,
    label: "anytime-fitness",
    confidence: 0.95,
  },
  {
    pattern: "crunch fitness",
    bucket: Bucket.EXPENSE,
    label: "crunch-fitness",
    confidence: 0.95,
  },

  // ─── EXPENSE: Gas / Auto ─────────────────────────────────────────────────
  {
    pattern: "shell",
    bucket: Bucket.EXPENSE,
    label: "shell-gas",
    confidence: 0.95,
  },
  {
    pattern: "chevron",
    bucket: Bucket.EXPENSE,
    label: "chevron-gas",
    confidence: 0.95,
  },
  {
    pattern: "bp",
    bucket: Bucket.EXPENSE,
    label: "bp-gas",
    confidence: 0.95,
  },
  {
    pattern: "sunpass",
    bucket: Bucket.EXPENSE,
    label: "sunpass-toll",
    confidence: 0.95,
  },
  {
    pattern: "geico",
    bucket: Bucket.EXPENSE,
    label: "geico-insurance",
    confidence: 0.95,
  },
  {
    pattern: "progressive",
    bucket: Bucket.EXPENSE,
    label: "progressive-insurance",
    confidence: 0.95,
  },
] as const satisfies MerchantRule[];
