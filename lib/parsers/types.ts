/**
 * lib/parsers/types.ts
 *
 * Shared types for the PDF parser plugin layer. Each bank (Bank of America,
 * Chase, Wells Fargo, …) implements the BankParser interface to extract
 * transactions from its statement PDF format.
 *
 * The plugin pattern exists so that adding a new bank is a ~200-line file
 * that registers itself in lib/parsers/index.ts — no other code changes.
 *
 * Data flow:
 *   PDF buffer → extractPdf() → raw text → detectBank(text) → BankParser
 *     → parser.parse(text, filename) → ParsedStatement
 *     → runPipeline() [classification, dedupe, HITL parking] → Firestore
 */

import type { SourceBank } from '@/lib/types/transaction';

/**
 * A single row as extracted from a statement PDF, BEFORE classification.
 * This is a dumb data bag — it carries nothing about bucket, confidence,
 * or user intent. Those come from the classifier pipeline downstream.
 */
export interface ParsedTransaction {
  /** Raw merchant/description text. Whitespace collapsed, multi-line joined. */
  merchantRaw: string;
  /** Signed dollar amount. Positive = inflow, negative = outflow. */
  amount: number;
  /** Full date with year resolved from the statement period header. */
  date: Date;
  /** Which section of the statement this row came from. Debugging aid. */
  section: StatementSection;
  /** Line index in the extracted text. Used in error reporting. */
  sourceLine: number;
}

/**
 * Named statement sections. Different banks use slightly different names,
 * but they all map to one of these conceptual buckets.
 */
export type StatementSection =
  | 'deposits'
  | 'card_subtractions'
  | 'other_subtractions'
  | 'checks'
  | 'fees';

/**
 * The complete output of a parser run for one statement file.
 * Pre-classification, pre-dedupe.
 */
export interface ParsedStatement {
  bank: SourceBank;
  sourceFile: string;
  accountHolder: string;
  /** Last 4 digits only — full account number never leaves the parser. */
  accountNumberMasked: string;
  periodStart: Date;
  periodEnd: Date;
  transactions: ParsedTransaction[];
  /**
   * Per-section sums as reported by the statement footer lines
   * (e.g. "Total deposits and other additions $15,154.31").
   * Used for checksum verification.
   */
  checksums: {
    deposits?: number;
    cardSubtractions?: number;
    otherSubtractions?: number;
  };
  /**
   * |sum(parsed rows in section) - checksum| per section.
   * A value > 0.01 means the parser missed or double-counted a row.
   * The upload UI surfaces these as warnings before committing.
   */
  checksumDelta: {
    deposits: number;
    cardSubtractions: number;
    otherSubtractions: number;
  };
  /** Non-blocking parser warnings shown in the preview UI. */
  warnings: string[];
}

/**
 * The bank parser plugin interface. Every bank parser exports a single
 * object implementing this interface and registers itself in index.ts.
 */
export interface BankParser {
  id: SourceBank;
  /** Human-readable name for UI display. */
  name: string;
  /**
   * Sniff test against extracted text. Should match a unique marker that
   * appears on the first page of this bank's statements (e.g. "Bank of
   * America.*Adv Plus Banking"). Keep cheap — runs on every upload.
   */
  detect(pdfText: string): boolean;
  /**
   * Parse the extracted text into a ParsedStatement. Throws ParserError
   * on unrecoverable failure (missing section markers, etc.). Non-fatal
   * issues go into ParsedStatement.warnings instead.
   */
  parse(pdfText: string, sourceFile: string): ParsedStatement;
}

/**
 * Thrown by a parser when it cannot produce a ParsedStatement at all.
 * The API route catches this and returns 422 with the message.
 *
 * Non-fatal parse issues (one bad row, checksum drift) should NOT throw —
 * they should be recorded in ParsedStatement.warnings and the import can
 * still proceed at the user's discretion.
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public readonly bank: SourceBank,
    public readonly sourceLine?: number,
  ) {
    super(message);
    this.name = 'ParserError';
  }
}
