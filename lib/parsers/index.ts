/**
 * lib/parsers/index.ts
 *
 * Parser registry — the single source of truth for which banks are
 * supported. Adding a new bank means importing its parser here and
 * appending to PARSERS. The detector walks this list in order.
 *
 * Order matters ONLY when two parsers could both claim the same PDF,
 * which shouldn't happen in practice because each detect() matches a
 * unique brand marker. BoA comes first because it's the heaviest-tested.
 */

import type { BankParser } from './types';
import { boaParser } from './boa-parser';
import { chaseParser } from './chase-parser';
import { wellsFargoParser } from './wells-fargo-parser';

export const PARSERS: BankParser[] = [
  boaParser,
  chaseParser,
  wellsFargoParser,
];

// Re-export types for consumers importing from the barrel.
export type {
  BankParser,
  ParsedStatement,
  ParsedTransaction,
  StatementSection,
} from './types';
export { ParserError } from './types';
export { extractPdf, type ExtractedPdf } from './pdf-extract';
export { detectBank } from './detect';
