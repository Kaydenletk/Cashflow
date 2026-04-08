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

import path from 'node:path';

import { PDFParse } from 'pdf-parse';

/**
 * Wire pdfjs-dist's worker source to the real file on disk.
 *
 * Without this, pdfjs-dist tries to auto-configure a "fake worker" and
 * fails under Next.js Turbopack with
 *     "No GlobalWorkerOptions.workerSrc specified"
 * even though vanilla Node (vite-node, our extract script) works out of
 * the box. Turbopack's loader shims module resolution just enough to
 * break pdfjs's auto-wire.
 *
 * We set it lazily inside extractPdf() rather than at module load because
 * Next's dev-mode HMR may reset the worker state between requests when
 * hot-reloading modules. Calling setWorker() on every extract is cheap
 * (it's a single property assignment inside pdfjs).
 */
let workerWired = false;
function ensureWorkerWired() {
  if (workerWired) return;
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs',
  );
  PDFParse.setWorker(workerPath);
  workerWired = true;
}

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
  ensureWorkerWired();
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
