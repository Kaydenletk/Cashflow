/**
 * lib/parsers/wells-fargo-parser.ts
 *
 * Wells Fargo statement parser — STUB. Same pattern as chase-parser.ts:
 * detect() matches Wells Fargo statements so the API route can return a
 * specific "Wells Fargo detected — parser coming soon" error rather than
 * a generic "unknown format" confusion.
 */

import {
  ParserError,
  type BankParser,
  type ParsedStatement,
} from './types';
import { SourceBank } from '@/lib/types/transaction';

export const wellsFargoParser: BankParser = {
  id: SourceBank.WELLS_FARGO,
  name: 'Wells Fargo',

  detect(pdfText: string): boolean {
    // Use [\s\S]{0,200} instead of .* so the match crosses newlines.
    // Wells Fargo headers often split "Wells Fargo Bank, N.A." from the
    // "Checking Account Statement" line with a newline and address block.
    return /Wells Fargo[\s\S]{0,200}(Account Statement|Checking|Savings)/i.test(
      pdfText,
    );
  },

  parse(_pdfText: string, _sourceFile: string): ParsedStatement {
    throw new ParserError(
      'Wells Fargo PDF parser is not yet implemented — support is planned for a future release.',
      SourceBank.WELLS_FARGO,
    );
  },
};
