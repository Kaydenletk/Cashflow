/**
 * app/api/pdf/parse/route.ts
 *
 * POST /api/pdf/parse — accept a multipart form upload containing a single
 * PDF file, extract text with pdf-parse, run the bank detector, and return
 * a ParsedStatement JSON payload. NO Firestore writes happen here.
 *
 * This route is pure: it takes a PDF in, returns a ParsedStatement out.
 * The commit step happens in the client after the user confirms the
 * preview — `lib/firebase/transactions.ts > addTransactionsBatch()` — and
 * is gated by Firestore rules at the database layer. Keeping the API
 * route Firestore-free lets us avoid pulling in firebase-admin for Phase C.
 *
 * Runtime: nodejs (NOT Edge). pdf-parse v2 uses pdfjs-dist which requires
 * Node Buffer / fs / stream APIs. The Edge runtime would refuse to load it.
 *
 * Error mapping:
 *   400 — no file, malformed PDF, unknown bank format
 *   422 — parser-level failure (ParserError thrown by a bank parser)
 *   500 — unexpected server error
 */

import { NextResponse } from 'next/server';

import { extractPdf } from '@/lib/parsers/pdf-extract';
import { detectBank } from '@/lib/parsers/detect';
import { ParserError } from '@/lib/parsers/types';

export const runtime = 'nodejs';
// Disable caching — every upload must hit the handler fresh.
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse multipart body and extract the "file" field.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            'Expected a multipart/form-data request with a "file" field containing a PDF.',
        },
        { status: 400 },
      );
    }
    const fileField = formData.get('file');

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded. Send a PDF as form field "file".' },
        { status: 400 },
      );
    }

    // Basic MIME sanity — don't trust the name extension alone.
    if (fileField.type && !fileField.type.includes('pdf')) {
      return NextResponse.json(
        {
          error: `Expected a PDF (application/pdf); received ${fileField.type}.`,
        },
        { status: 400 },
      );
    }

    // 2. Read into a Buffer and run the extractor.
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extracted;
    try {
      extracted = await extractPdf(buffer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown PDF extraction error';
      return NextResponse.json(
        {
          error:
            'Unable to read PDF — please confirm the file is a text-based statement (not a scanned image or encrypted).',
          detail: message,
        },
        { status: 400 },
      );
    }

    // 3. Detect which bank parser to use.
    const parser = detectBank(extracted.fullText);
    if (!parser) {
      return NextResponse.json(
        {
          error:
            'Unknown bank format. Compound currently supports Bank of America checking statements.',
        },
        { status: 400 },
      );
    }

    // 4. Run the parser.
    let statement;
    try {
      statement = parser.parse(extracted.fullText, fileField.name);
    } catch (err) {
      if (err instanceof ParserError) {
        return NextResponse.json(
          { error: err.message, bank: err.bank, sourceLine: err.sourceLine },
          { status: 422 },
        );
      }
      throw err; // unexpected — bubble to the outer catch
    }

    // 5. Return the ParsedStatement. Dates serialize as ISO strings over JSON.
    return NextResponse.json(
      {
        statement,
        parserName: parser.name,
      },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error';
    return NextResponse.json(
      { error: 'Unexpected server error while parsing PDF.', detail: message },
      { status: 500 },
    );
  }
}
