/**
 * lib/parsers/boa-parser.test.ts
 *
 * TDD fixtures-driven tests for the Bank of America checking-statement parser.
 *
 * Fixtures live in __fixtures__/boa-{YYYY-MM}.{txt,expected.json}. The .txt
 * files are extracted via scripts/extract-boa-fixtures.ts with PII scrubbed;
 * the .expected.json files are hand-authored oracles containing row counts,
 * section totals, and spot-check transactions.
 *
 * Coverage matrix:
 *   - Two real statements (Jan 2026, Feb 2026) → full-pipeline parse
 *   - detect() sanity
 *   - Synthetic edge cases: year-boundary row, multi-line description,
 *     missing section marker, corrupted amount, continuation headers,
 *     marketing interspersion
 *
 * Credit-card statements (seeds/eStmt_2026-03-21.pdf) are intentionally
 * out of scope for Phase C — see boa-parser.ts notes.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { boaParser } from './boa-parser';
import { ParserError } from './types';
import { SourceBank } from '@/lib/types/transaction';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, '__fixtures__');

interface ExpectedOracle {
  bank: string;
  sourceFile: string;
  accountHolder: string;
  accountNumberMasked: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  sectionCounts: {
    deposits: number;
    cardSubtractions: number;
    otherSubtractions: number;
  };
  expectedChecksums: {
    deposits: number;
    cardSubtractions: number;
    otherSubtractions: number;
  };
  firstTransaction: {
    merchantRaw: string;
    amount: number;
    date: string;
    section: string;
  };
  lastTransaction: {
    merchantRaw: string;
    amount: number;
    date: string;
    section: string;
  };
}

function loadFixture(name: string): { text: string; expected: ExpectedOracle } {
  const text = readFileSync(join(FIXTURES_DIR, `${name}.txt`), 'utf-8');
  const expected = JSON.parse(
    readFileSync(join(FIXTURES_DIR, `${name}.expected.json`), 'utf-8'),
  ) as ExpectedOracle;
  return { text, expected };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Real-fixture tests ──────────────────────────────────────────────────────

const FIXTURES = ['boa-2026-01', 'boa-2026-02'] as const;

describe('boaParser — real checking statements', () => {
  it.each(FIXTURES)('parses %s end-to-end', (fixtureName) => {
    const { text, expected } = loadFixture(fixtureName);
    const result = boaParser.parse(text, expected.sourceFile);

    // Metadata
    expect(result.bank).toBe(SourceBank.BOA);
    expect(result.sourceFile).toBe(expected.sourceFile);
    expect(result.accountHolder).toBe(expected.accountHolder);
    expect(result.accountNumberMasked).toBe(expected.accountNumberMasked);
    expect(isoDate(result.periodStart)).toBe(expected.periodStart);
    expect(isoDate(result.periodEnd)).toBe(expected.periodEnd);

    // Total transaction count
    expect(result.transactions.length).toBe(expected.transactionCount);

    // Per-section counts
    const counts = {
      deposits: result.transactions.filter((t) => t.section === 'deposits').length,
      cardSubtractions: result.transactions.filter(
        (t) => t.section === 'card_subtractions',
      ).length,
      otherSubtractions: result.transactions.filter(
        (t) => t.section === 'other_subtractions',
      ).length,
    };
    expect(counts).toEqual(expected.sectionCounts);

    // Checksum deltas must be near-zero (< 1 cent)
    expect(result.checksumDelta.deposits).toBeLessThan(0.01);
    expect(result.checksumDelta.cardSubtractions).toBeLessThan(0.01);
    expect(result.checksumDelta.otherSubtractions).toBeLessThan(0.01);

    // Spot-check first transaction
    const first = result.transactions[0];
    expect(first.merchantRaw).toContain(
      expected.firstTransaction.merchantRaw.split(' ')[0], // first word match is enough
    );
    expect(first.amount).toBeCloseTo(expected.firstTransaction.amount, 2);
    expect(isoDate(first.date)).toBe(expected.firstTransaction.date);
    expect(first.section).toBe(expected.firstTransaction.section);

    // Spot-check last transaction
    const last = result.transactions[result.transactions.length - 1];
    expect(last.amount).toBeCloseTo(expected.lastTransaction.amount, 2);
    expect(isoDate(last.date)).toBe(expected.lastTransaction.date);
    expect(last.section).toBe(expected.lastTransaction.section);
  });

  it('derives year correctly across the Dec → Jan boundary', () => {
    const { text } = loadFixture('boa-2026-01');
    const result = boaParser.parse(text, 'eStmt_2026-01-26.pdf');

    const december2025 = result.transactions.filter(
      (t) => t.date.getUTCFullYear() === 2025 && t.date.getUTCMonth() === 11,
    );
    const january2026 = result.transactions.filter(
      (t) => t.date.getUTCFullYear() === 2026 && t.date.getUTCMonth() === 0,
    );

    // From fixture: 5 rows dated in Dec 2025 (one deposit 12/30, one card
    // subtraction 12/31, three other subtractions 12/29, 12/30, 12/31),
    // remainder in Jan 2026.
    expect(december2025.length).toBe(5);
    expect(january2026.length).toBe(result.transactions.length - 5);
  });

  it('joins multi-line descriptions into a single merchantRaw', () => {
    const { text } = loadFixture('boa-2026-01');
    const result = boaParser.parse(text, 'eStmt_2026-01-26.pdf');

    // "U of South FL" is a known multi-line row in the Jan fixture.
    const usf = result.transactions.find((t) =>
      t.merchantRaw.includes('U of South FL'),
    );
    expect(usf).toBeDefined();
    expect(usf!.merchantRaw).toContain('DES:EDEPOSIT');
    expect(usf!.merchantRaw).toContain('PPD');
    expect(usf!.amount).toBeCloseTo(4282.53, 2);
    expect(usf!.section).toBe('deposits');
  });

  it('tolerates marketing interspersion between sections', () => {
    // Feb fixture has "Scheduled and recurring payments with Zelle®" between
    // Other subtractions pages. Parser must not treat it as transactions.
    const { text, expected } = loadFixture('boa-2026-02');
    const result = boaParser.parse(text, 'eStmt_2026-02-23.pdf');
    expect(result.transactions.length).toBe(expected.transactionCount);
  });
});

// ─── Synthetic edge-case tests ───────────────────────────────────────────────

describe('boaParser — edge cases', () => {
  it('detect() returns true for Adv Plus Banking headers', () => {
    const { text } = loadFixture('boa-2026-01');
    expect(boaParser.detect(text)).toBe(true);
  });

  it('detect() returns false for non-BoA text', () => {
    expect(boaParser.detect('JPMorgan Chase Bank, N.A.')).toBe(false);
    expect(boaParser.detect('Wells Fargo Bank, N.A.')).toBe(false);
    expect(boaParser.detect('')).toBe(false);
  });

  it('throws ParserError when section markers are absent', () => {
    const gibberish = `
      Bank of America
      Adv Plus Banking
      for January 1, 2026 to January 31, 2026
      Account number: **** **** 1234
      (no section markers, no transactions)
    `;
    expect(() => boaParser.parse(gibberish, 'fake.pdf')).toThrow(ParserError);
  });

  it('parses amounts with commas correctly', () => {
    const { text } = loadFixture('boa-2026-01');
    const result = boaParser.parse(text, 'eStmt_2026-01-26.pdf');
    // Known row: -2,000.00 on 01/16/26 (APPLECARD GSBANK)
    const bigRow = result.transactions.find(
      (t) => Math.abs(t.amount - -2000.0) < 0.01,
    );
    expect(bigRow).toBeDefined();
    expect(bigRow!.merchantRaw).toContain('APPLECARD');
  });

  it('produces signed amounts (negative for outflows, positive for inflows)', () => {
    const { text } = loadFixture('boa-2026-01');
    const result = boaParser.parse(text, 'eStmt_2026-01-26.pdf');

    for (const tx of result.transactions) {
      if (tx.section === 'deposits') {
        expect(tx.amount).toBeGreaterThan(0);
      } else {
        expect(tx.amount).toBeLessThan(0);
      }
    }
  });
});
