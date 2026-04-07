/**
 * lib/parsers/detect.test.ts
 *
 * Verifies detectBank() picks the right parser for each bank's signature
 * text, returns null for unknown formats, and that the BoA stub detect()
 * tolerates the real header text we observed in seeds/eStmt_2026-01-26.pdf.
 *
 * These tests intentionally use short synthetic inputs plus one real-ish
 * BoA snippet. Full-file parser fixtures are introduced in Task 4.
 */

import { describe, it, expect } from 'vitest';

import { detectBank } from './detect';
import { boaParser } from './boa-parser';
import { chaseParser } from './chase-parser';
import { wellsFargoParser } from './wells-fargo-parser';
import { SourceBank } from '@/lib/types/transaction';

describe('detectBank', () => {
  it('returns the BoA parser for an Adv Plus Banking statement header', () => {
    const snippet = `
      BANK OF AMERICA
      P.O. Box 15284
      Wilmington, DE 19850
      Your Adv Plus Banking
      for December 25, 2025 to January 26, 2026
    `;
    const parser = detectBank(snippet);
    expect(parser).toBe(boaParser);
    expect(parser?.id).toBe(SourceBank.BOA);
  });

  it('returns the BoA parser for an Advantage product line', () => {
    const snippet = 'Bank of America — Advantage Savings Account';
    expect(detectBank(snippet)).toBe(boaParser);
  });

  it('returns the Chase parser for a Chase Total Checking statement', () => {
    const snippet = 'JPMorgan Chase Bank, N.A.\nChase Total Checking';
    const parser = detectBank(snippet);
    expect(parser).toBe(chaseParser);
    expect(parser?.id).toBe(SourceBank.CHASE);
  });

  it('returns the Wells Fargo parser for a Wells Fargo statement', () => {
    const snippet = 'Wells Fargo Bank, N.A.\nChecking Account Statement';
    const parser = detectBank(snippet);
    expect(parser).toBe(wellsFargoParser);
    expect(parser?.id).toBe(SourceBank.WELLS_FARGO);
  });

  it('returns null for an unknown bank format', () => {
    const snippet = 'Some Random Credit Union\nMonthly Statement';
    expect(detectBank(snippet)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(detectBank('')).toBeNull();
  });

  it('does not cross-match: Chase snippet must not be detected as BoA', () => {
    const snippet = 'JPMorgan Chase Bank — Chase Savings Account';
    const parser = detectBank(snippet);
    expect(parser?.id).toBe(SourceBank.CHASE);
    expect(parser?.id).not.toBe(SourceBank.BOA);
  });
});

describe('parse() error paths', () => {
  it('BoA parse() throws ParserError on empty input', () => {
    // Task 4 implemented the real parser; empty/invalid input now throws
    // with a different (still meaningful) message. Dedicated BoA error
    // coverage lives in boa-parser.test.ts.
    expect(() => boaParser.parse('', 'test.pdf')).toThrow(/empty|period|section/i);
  });

  it('Chase parse() throws with a "not yet implemented" message', () => {
    expect(() => chaseParser.parse('', 'test.pdf')).toThrow(/not yet implemented/i);
  });

  it('Wells Fargo parse() throws with a "not yet implemented" message', () => {
    expect(() => wellsFargoParser.parse('', 'test.pdf')).toThrow(
      /not yet implemented/i,
    );
  });
});
