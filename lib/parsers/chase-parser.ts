/**
 * lib/parsers/chase-parser.ts
 *
 * Chase (JPMorgan Chase Bank) statement parser — STUB.
 *
 * Rationale: the multi-bank plugin pattern must work from day 1, even if
 * only the BoA parser ships in Phase C. detect() returns true for Chase
 * PDFs so the API route can return a friendly "Chase detected — parser
 * coming soon" message instead of the generic "Unknown bank format" that
 * would make the user think their file is corrupt.
 *
 * When Chase support lands: replace parse() with a state machine, add a
 * fixture file under __fixtures__/, and write tests mirroring boa-parser.test.ts.
 */

import {
  ParserError,
  type BankParser,
  type ParsedStatement,
} from './types';
import { SourceBank } from '@/lib/types/transaction';

export const chaseParser: BankParser = {
  id: SourceBank.CHASE,
  name: 'Chase',

  detect(pdfText: string): boolean {
    // Match either the JPMorgan legal-entity header or any "Chase ..."
    // product-line string. Chase PDFs typically include both somewhere
    // on page 1, so either hit is enough.
    return /JPMorgan Chase Bank|Chase\s+(Total Checking|Savings|Premier|Sapphire)/i.test(
      pdfText,
    );
  },

  parse(_pdfText: string, _sourceFile: string): ParsedStatement {
    throw new ParserError(
      'Chase PDF parser is not yet implemented — support is planned for a future release.',
      SourceBank.CHASE,
    );
  },
};
