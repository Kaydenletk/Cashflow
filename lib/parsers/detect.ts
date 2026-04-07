/**
 * lib/parsers/detect.ts
 *
 * Bank detection — pick the first parser whose detect() matches the
 * extracted PDF text. Simple linear scan is fine: we ship with 3 parsers,
 * and adding 5 more won't move the needle on upload latency.
 *
 * Returns null if no parser matches. The caller (API route) should
 * translate null → HTTP 400 with "Unknown bank format".
 */

import type { BankParser } from './types';
import { PARSERS } from './index';

export function detectBank(pdfText: string): BankParser | null {
  for (const parser of PARSERS) {
    if (parser.detect(pdfText)) {
      return parser;
    }
  }
  return null;
}
