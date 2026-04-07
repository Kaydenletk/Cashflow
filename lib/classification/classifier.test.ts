import { describe, it, expect } from "vitest";
import { classify } from "./classifier";
import { Bucket, ClassifiedBy, IncomeType } from "@/lib/types/transaction";

describe("classify()", () => {
  // ── Bucket: ASSET ────────────────────────────────────────────────────────

  it("classifies Vanguard as ASSET via merchant rule", () => {
    const result = classify({ merchant: "Vanguard" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("vanguard");
  });

  it("classifies Fidelity as ASSET via merchant rule", () => {
    const result = classify({ merchant: "Fidelity Investments" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("fidelity");
  });

  it("classifies Robinhood as ASSET via merchant rule", () => {
    const result = classify({ merchant: "Robinhood" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
  });

  it("classifies Schwab as ASSET via merchant rule", () => {
    const result = classify({ merchant: "Charles Schwab" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("charles-schwab");
  });

  it("classifies via category rule when merchant doesn't match (investments category → ASSET)", () => {
    const result = classify({ merchant: "Unknown Broker XYZ", category: "investments" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-investments");
  });

  // ── Bucket: LIABILITY ────────────────────────────────────────────────────

  it("classifies CHASE PAYMENT as LIABILITY via merchant rule", () => {
    const result = classify({ merchant: "CHASE PAYMENT" });
    expect(result.bucket).toBe(Bucket.LIABILITY);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("chase-card-payment");
  });

  it("classifies AMEX PAYMENT as LIABILITY via merchant rule", () => {
    const result = classify({ merchant: "AMEX PAYMENT" });
    expect(result.bucket).toBe(Bucket.LIABILITY);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("amex-card-payment");
  });

  it("classifies Nelnet as LIABILITY via merchant rule (student loan)", () => {
    const result = classify({ merchant: "NELNET STUDENT LOANS" });
    expect(result.bucket).toBe(Bucket.LIABILITY);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("nelnet-student-loan");
  });

  it("classifies MOHELA as LIABILITY via merchant rule (student loan)", () => {
    const result = classify({ merchant: "MOHELA" });
    expect(result.bucket).toBe(Bucket.LIABILITY);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("mohela-student-loan");
  });

  it("classifies mortgage via category rule as LIABILITY", () => {
    const result = classify({ merchant: "First Home Corp", category: "mortgage" });
    expect(result.bucket).toBe(Bucket.LIABILITY);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-mortgage");
  });

  // ── Bucket: EXPENSE ──────────────────────────────────────────────────────

  it("classifies Publix as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Publix #1234" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("publix");
  });

  it("classifies Uber as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Uber" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("uber");
  });

  it("classifies Amazon as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Amazon.com" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("amazon");
  });

  it("classifies Netflix as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Netflix" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("netflix");
  });

  it("classifies Datz (Tampa local) as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Datz Restaurant" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("datz-tampa");
  });

  it("classifies Rooster & The Till as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Rooster & The Till Tampa" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("rooster-and-the-till");
  });

  it("classifies Starbucks as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Starbucks Store #9042" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("starbucks");
  });

  it("classifies via category rule for groceries as EXPENSE", () => {
    const result = classify({ merchant: "Local Corner Store", category: "groceries" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-groceries");
  });

  // ── Bucket: INCOME (ACTIVE) ───────────────────────────────────────────────

  it("classifies Direct Deposit as INCOME ACTIVE via merchant rule", () => {
    const result = classify({ merchant: "Direct Deposit - Payroll" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.ACTIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("direct-deposit");
  });

  it("classifies Gusto payroll as INCOME ACTIVE via merchant rule", () => {
    const result = classify({ merchant: "Gusto Payroll Transfer" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.ACTIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("gusto-payroll");
  });

  it("classifies salary category as INCOME ACTIVE via category rule", () => {
    const result = classify({ merchant: "Employer ABC", category: "salary" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.ACTIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-salary");
  });

  // ── Bucket: INCOME (PASSIVE) ──────────────────────────────────────────────

  it("classifies dividend as INCOME PASSIVE via merchant rule", () => {
    const result = classify({ merchant: "Dividend Reinvestment VOO" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.PASSIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedRule).toBe("dividend");
  });

  it("classifies interest earned as INCOME PASSIVE via merchant rule", () => {
    const result = classify({ merchant: "Interest Earned" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.PASSIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("interest-earned");
  });

  it("classifies dividends category as INCOME PASSIVE via category rule", () => {
    const result = classify({ merchant: "Some Fund", category: "dividends" });
    expect(result.bucket).toBe(Bucket.INCOME);
    expect(result.incomeType).toBe(IncomeType.PASSIVE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-dividends");
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("matches case-insensitively (lowercase 'vanguard' merchant)", () => {
    const result = classify({ merchant: "vanguard" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
  });

  it("matches case-insensitively (all-caps 'VANGUARD' merchant)", () => {
    const result = classify({ merchant: "VANGUARD" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
  });

  it("matches merchant substring ('VANGUARD BROKERAGE ACCOUNT' contains 'vanguard')", () => {
    const result = classify({ merchant: "VANGUARD BROKERAGE ACCOUNT" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
  });

  it("merchant rule wins over category rule when both could apply", () => {
    // Publix matches merchant rule (EXPENSE) — category 'investments' would be ASSET
    // Merchant rule must win
    const result = classify({ merchant: "Publix", category: "investments" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.confidence).toBe(0.95);
  });

  it("falls back to category rule when no merchant match", () => {
    const result = classify({ merchant: "UNKNOWN MERCHANT 99", category: "utilities" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.75);
    expect(result.matchedRule).toBe("category-utilities");
  });

  it("falls back to EXPENSE default (confidence 0.3) when neither merchant nor category matches", () => {
    const result = classify({ merchant: "TOTALLY UNKNOWN XYZ", category: "unrecognized-category" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.3);
    expect(result.matchedRule).toBe("fallback-default");
    expect(result.incomeType).toBeUndefined();
  });

  it("falls back to EXPENSE default (confidence 0.3) with no category at all", () => {
    const result = classify({ merchant: "TOTALLY UNKNOWN XYZ" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.CATEGORY);
    expect(result.confidence).toBe(0.3);
    expect(result.matchedRule).toBe("fallback-default");
  });

  it("confidence is 0.95 for merchant matches, 0.75 for category matches, 0.3 for fallback", () => {
    const merchantMatch = classify({ merchant: "Spotify" });
    const categoryMatch = classify({ merchant: "Unknown", category: "groceries" });
    const fallback = classify({ merchant: "Unknown" });

    expect(merchantMatch.confidence).toBe(0.95);
    expect(categoryMatch.confidence).toBe(0.75);
    expect(fallback.confidence).toBe(0.3);
  });

  it("does not set incomeType for EXPENSE or ASSET results", () => {
    const expense = classify({ merchant: "Publix" });
    const asset = classify({ merchant: "Vanguard" });
    expect(expense.incomeType).toBeUndefined();
    expect(asset.incomeType).toBeUndefined();
  });

  it("classifies Coinbase as ASSET via merchant rule", () => {
    const result = classify({ merchant: "Coinbase Purchase" });
    expect(result.bucket).toBe(Bucket.ASSET);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("coinbase");
  });

  it("classifies T-Mobile as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "T-Mobile" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("t-mobile");
  });

  it("classifies Lyft as EXPENSE via merchant rule", () => {
    const result = classify({ merchant: "Lyft Ride" });
    expect(result.bucket).toBe(Bucket.EXPENSE);
    expect(result.classifiedBy).toBe(ClassifiedBy.RULE);
    expect(result.matchedRule).toBe("lyft");
  });
});
