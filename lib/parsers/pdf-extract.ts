/**
 * lib/parsers/pdf-extract.ts
 *
 * Thin wrapper around the `pdf-parse` v2 API. Yields a shape our bank
 * parsers can consume (full text + pre-normalized lines).
 *
 * Design rationale:
 *   - pdf-parse v2 exposes a PDFParse class whose getText() returns a
 *     TextResult with `{ text, total, pages }`. We want to abstract that
 *     and guarantee the doc is destroyed even if extraction throws.
 *   - BoA state-machine parsers are cleaner walking an array of normalized,
 *     non-empty lines — so we pre-process once here and hand the parser
 *     both raw `fullText` (for regex sniffing in detect()) and `lines`
 *     (for state-machine iteration).
 *
 * Node-only: pdf-parse v2 uses pdfjs-dist under the hood, which requires
 * Node Buffer/fs APIs. The /api/pdf/parse route MUST declare
 * `export const runtime = 'nodejs'` (not Edge).
 */

import { PDFParse } from 'pdf-parse';

export interface ExtractedPdf {
  /** Raw text as returned by pdf-parse, newlines preserved. */
  fullText: string;
  /** Number of pages in the source PDF. */
  numPages: number;
  /**
   * Normalized lines: trimmed, internal whitespace collapsed to single
   * spaces, empty lines dropped. This is what state-machine parsers iterate.
   */
  lines: string[];
}

/**
 * Extract text from a PDF buffer. Throws if the buffer is not a valid PDF,
 * if the PDF is encrypted, or if text extraction fails (e.g. pure-image scans).
 *
 * Always destroys the underlying PDFParse doc in a finally block to free
 * the pdfjs-dist worker memory, even on error paths.
 */
export async function extractPdf(buffer: Buffer): Promise<ExtractedPdf> {
  // PDFParse accepts Buffer and normalizes to Uint8Array internally.
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();

    const lines = result.text
      .split(/\r?\n/)
      .map((line: string) => line.replace(/\s+/g, ' ').trim())
      .filter((line: string) => line.length > 0);

    return {
      fullText: result.text,
      numPages: result.total,
      lines,
    };
  } finally {
    await parser.destroy();
  }
}
