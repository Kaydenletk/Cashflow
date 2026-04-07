/**
 * lib/parsers/boa-parser.ts
 *
 * Bank of America statement parser.
 *
 * TASK 3 STUB: detect() is wired up so the registry + /api/pdf/parse route
 * can route BoA uploads here, but parse() throws "not yet implemented".
 * Task 4 replaces this with the full state-machine implementation, driven
 * by TDD against lib/parsers/__fixtures__/boa-2026-*.txt.
 *
 * Supported layout (as observed in seeds/eStmt_2026-01-26.pdf):
 *   - "Bank of America" wordmark on page 1
 *   - "Adv Plus Banking" or "Advantage" product name
 *   - Statement period header: "for <Month DD, YYYY> to <Month DD, YYYY>"
 *   - Section markers: "Deposits and other additions",
 *     "ATM and debit card subtractions", "Other subtractions"
 *   - Row format: "MM/DD/YY  <description>  <amount>"
 *   - Section total lines: "Total <section name>  $<amount>"
 */

import {
  ParserError,
  type BankParser,
  type ParsedStatement,
} from './types';
import { SourceBank } from '@/lib/types/transaction';

export const boaParser: BankParser = {
  id: SourceBank.BOA,
  name: 'Bank of America',

  detect(pdfText: string): boolean {
    // Match either the "Adv Plus Banking" or "Advantage" product lines.
    // Case-insensitive because BoA has been known to shuffle capitalization
    // across statement template revisions.
    return /Bank of America[\s\S]{0,200}(Adv Plus Banking|Advantage)/i.test(
      pdfText,
    );
  },

  parse(_pdfText: string, _sourceFile: string): ParsedStatement {
    throw new ParserError(
      'Bank of America parser is under construction (Task 4)',
      SourceBank.BOA,
    );
  },
};
