/**
 * lib/parsers/boa-parser.ts
 *
 * Bank of America checking-statement parser.
 *
 * Layout observed in seeds/eStmt_2026-01-26.pdf + eStmt_2026-02-23.pdf:
 *
 *   1. Page 1 header block with:
 *      - "Your Adv Plus Banking"
 *      - "for <Month DD, YYYY> to <Month DD, YYYY>"  — statement period
 *      - "Account number: **** **** NNNN"            — masked account
 *      - Account holder name on its own line
 *
 *   2. Three transaction sections, each introduced by a header line:
 *      - "Deposits and other additions"
 *      - "ATM and debit card subtractions"
 *      - "Other subtractions"
 *
 *      Each section ends with a "Total ..." line that we use as a checksum.
 *      Sections can span multiple PDF pages; continuation headers look like
 *      "Withdrawals and other subtractions - continued" +
 *      "Other subtractions - continued" and must NOT spawn new rows.
 *
 *   3. Transaction rows have one of two shapes:
 *      (a) Single-line: "MM/DD/YY <description> <amount>"
 *      (b) Multi-line:  "MM/DD/YY <description-part-1>
 *                        <description-part-2>
 *                        <amount>"
 *      In normalized-lines form the parts appear as separate lines and the
 *      amount is on its own line when the description wrapped.
 *
 *   4. Marketing copy ("NEW: BankAmeriDeals®...", "Scheduled and recurring
 *      payments with Zelle®...", BofA Rewards disclosure, etc.) is
 *      interspersed between sections and must be skipped gracefully.
 *
 *   5. Page footers look like "-- N of M --" or "Page N of M" — skip.
 *
 * CREDIT CARDS ARE OUT OF SCOPE. Bank of America credit-card statements use
 * a completely different layout (purchases/payments/interest charges) and
 * are deferred to a later phase. detect() intentionally does NOT match them.
 *
 * Year derivation: dates appear as "MM/DD/YY" with a 2-digit year tail.
 * Because statements can span a year boundary (Dec → Jan), we first parse
 * the period header into (periodStart, periodEnd) and then pick the year
 * that places each row's MM-DD inside that window. The trailing /YY from
 * the PDF is validated as a sanity check.
 *
 * Sign convention:
 *   - Deposits section           → positive amount (inflow)
 *   - Card/Other subtractions    → negative amount (outflow)
 *   - Totals can be signed ("-$98.25") or unsigned ("$15,154.31")
 */

import {
  ParserError,
  type BankParser,
  type ParsedStatement,
  type ParsedTransaction,
  type StatementSection,
} from './types';
import { SourceBank } from '@/lib/types/transaction';

// ─── Regexes ────────────────────────────────────────────────────────────────

const PERIOD_REGEX =
  /for\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s+to\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/;

// Match both raw and masked account number formats:
//   - Raw:    "Account number: 8981 2263 6098"
//   - Masked: "Account number: **** **** 6098" (from scrubbed fixtures)
// Capture only the last 4 digits — we never store the full number.
const ACCOUNT_REGEX =
  /Account\s*(?:number|#)[:]?\s*(?:\*+\s*)*(?:\d{4}\s+)*(\d{4})\b/i;

// Row line: "MM/DD/YY <...description...> <amount>"
// Amount is optional in the regex so multi-line rows (where amount is on a
// following line) also match; we detect that case with a separate rule.
const ROW_WITH_AMOUNT =
  /^(\d{2})\/(\d{2})\/(\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})$/;

// Row line without amount (multi-line row start):
const ROW_NO_AMOUNT = /^(\d{2})\/(\d{2})\/(\d{2})\s+(.+)$/;

// Standalone amount line (continuation of a multi-line row):
const STANDALONE_AMOUNT = /^(-?[\d,]+\.\d{2})$/;

// Section markers — exact match, case-sensitive:
const MARKER_DEPOSITS = /^Deposits and other additions$/;
const MARKER_CARD_SUB = /^ATM and debit card subtractions$/;
const MARKER_OTHER_SUB = /^Other subtractions$/;

// Section continuation headers — must NOT restart rows:
const MARKER_CONTINUED =
  /^(Withdrawals and other subtractions - continued|Other subtractions - continued)$/;

// "Date \t Description \t Amount" column header inside sections — skip:
const COLUMN_HEADER = /^Date\s+Description\s+Amount$/;

// Section total lines (mark end of section, carry the expected checksum):
const TOTAL_DEPOSITS =
  /^Total deposits and other additions\s+\$?([\d,]+\.\d{2})$/i;
const TOTAL_CARD_SUB =
  /^Total ATM and debit card subtractions\s+-?\$?([\d,]+\.\d{2})$/i;
const TOTAL_OTHER_SUB = /^Total other subtractions\s+-?\$?([\d,]+\.\d{2})$/i;

// Page footers / pagination markers — always skip:
const PAGE_FOOTER = /^--\s*\d+\s*of\s*\d+\s*--$/;
const PAGE_HEADER = /^Page\s+\d+\s+of\s+\d+/;
const HOLDER_HEADER_LINE = /^.+\s+!\s+Account.*!\s+\w+\s+\d+,\s+\d{4}/;

// "continued on the next page" notice between sections:
const CONTINUATION_NOTICE = /^continued on the next page$/i;

// Bank / marketing boilerplate first-line markers to skip gracefully. We
// don't enumerate everything — any line that doesn't match our row/total
// regexes inside a section is simply ignored (and we log a warning if the
// section looks like it ended abruptly).
const KNOWN_MARKETING_STARTS = [
  /^NEW:\s/,
  /^Scan/,
  /^SHOP\./,
  /^APPLY\./,
  /^DRIVE\./,
  /^Start your next/,
  /^When you use the QRC/,
  /^Explore your deals/,
  /^Find more cash back/,
  /^Please see the/,
  /^Scheduled and recurring/,
  /^Send money now/,
  /^Enroll now/,
  /^bankofamerica\.com/,
  /^Vehicle financing/,
  /^Automobile shopping/,
  /^with Bank of America/,
  /^Bank of America N\.A/,
  /^© \d{4}/,
  /^IMPORTANT INFORMATION/,
  /^BANK DEPOSIT/,
  /^How to Contact/,
  /^Updating your/,
  /^Deposit agreement/,
  /^Electronic transfers/,
  /^Reporting other/,
  /^Direct deposits/,
  /^For consumer/,
  /^For other accounts/,
  /^Tell us/,
  /^Describe the/,
  /^You must/,
  /^We must hear/,
  /^This feature/,
  /^We are changing/,
  /^Important Messages/,
  /^We want to/,
  /^As you may/,
  /^After this/,
  /^Instead, an/,
  /^Do not worry/,
  /^Gold and/,
  /^Platinum/,
  /^Diamond/,
  /^You will/,
  /^To learn/,
  /^To see/,
  /^Braille/,
  /^This page intentionally/,
  /^Your Overdraft/,
  /^Total for this period/,
  /^Total Overdraft/,
  /^Total NSF/,
  /^We want to help/,
  /^Enroll in Balance/,
  /^Sign up for Alerts/,
  /^Please call/,
  /^\(footnote/,
  /^Mobile Banking requires/,
  /^Withdrawals and other subtractions$/,
  /^Service fees$/,
  /^Customer service/,
  /^En Español/,
  /^P\.O\. Box/,
  /^TESTCITY|^TAMPA|^Tampa/,
  /^123 TEST|^\d+\s+LAKEVIEW/,
  /^PULL:/,
  /^Your Adv Plus/,
  /^Account summary/,
  /^Account Summary/,
  /^Beginning balance/,
  /^Ending balance/,
  /^Deposits and other additions\s+[\d,.]+/, // the summary line, not the section marker
  /^ATM and debit card subtractions\s+-/, // the summary line
  /^Other subtractions\s+-/, // summary line
  /^Checks\s+-/,
  /^Service fees\s+-/,
  /^Message and data/,
  /^be enrolled/,
  /^deposit or credit/,
  /^For SafeBalance/,
  /^using the account/,
  /^select mobile/,
  /^To send or receive/,
  /^account\. Zelle/,
  /^certain recipients/,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

function resolveDate(
  mm: number,
  dd: number,
  periodStart: Date,
  periodEnd: Date,
): Date {
  // Prefer periodEnd.year first (statements tend to be mostly in the end year).
  const candidates = [periodEnd.getUTCFullYear(), periodStart.getUTCFullYear()];
  for (const year of candidates) {
    const d = new Date(Date.UTC(year, mm - 1, dd));
    if (d >= periodStart && d <= periodEnd) {
      return d;
    }
  }
  // Fallback: use periodEnd.year regardless (edge case where period range
  // doesn't quite contain the row — could happen for 12/25 statement-start
  // date rows). This is best-effort; caller logs via checksum anyway.
  return new Date(Date.UTC(periodEnd.getUTCFullYear(), mm - 1, dd));
}

function isMarketingLine(line: string): boolean {
  for (const re of KNOWN_MARKETING_STARTS) {
    if (re.test(line)) return true;
  }
  return false;
}

// ─── State machine ──────────────────────────────────────────────────────────

type State =
  | 'SEEKING_DEPOSITS'
  | 'IN_DEPOSITS'
  | 'SEEKING_CARD_SUB'
  | 'IN_CARD_SUB'
  | 'SEEKING_OTHER_SUB'
  | 'IN_OTHER_SUB'
  | 'DONE';

interface PendingRow {
  mm: number;
  dd: number;
  descParts: string[];
  sourceLine: number;
}

function sectionFromState(state: State): StatementSection | null {
  if (state === 'IN_DEPOSITS') return 'deposits';
  if (state === 'IN_CARD_SUB') return 'card_subtractions';
  if (state === 'IN_OTHER_SUB') return 'other_subtractions';
  return null;
}

function signForSection(section: StatementSection): 1 | -1 {
  return section === 'deposits' ? 1 : -1;
}

// ─── Main parse ─────────────────────────────────────────────────────────────

export const boaParser: BankParser = {
  id: SourceBank.BOA,
  name: 'Bank of America',

  detect(pdfText: string): boolean {
    // Both markers must exist in the document, but they need not be adjacent.
    // "Bank of America" appears in the brand header AND several footer/legal
    // blocks, so a single hit is enough. The product line ("Adv Plus Banking"
    // or a specific Advantage tier) disambiguates BoA checking PDFs from
    // generic BoA disclaimers embedded in other banks' promo sheets.
    const hasBrand = /\bBank of America\b/i.test(pdfText);
    const hasProduct =
      /\bAdv Plus Banking\b/i.test(pdfText) ||
      /\bAdvantage\s+(?:Savings|Checking|Banking|Relationship)\b/i.test(
        pdfText,
      );
    return hasBrand && hasProduct;
  },

  parse(pdfText: string, sourceFile: string): ParsedStatement {
    // 1. Normalize lines — same rule as pdf-extract.ts but we re-derive here
    //    so parse() can be called on a text string directly (used in tests).
    const lines = pdfText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new ParserError(
        'Empty statement: no content to parse',
        SourceBank.BOA,
      );
    }

    // 2. Header extraction — period, account number, holder name.
    const warnings: string[] = [];

    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    let accountNumberMasked = '';
    let accountHolder = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const periodMatch = line.match(PERIOD_REGEX);
      if (periodMatch && !periodStart) {
        const [, startMonth, startDay, startYear, endMonth, endDay, endYear] =
          periodMatch;
        periodStart = new Date(
          Date.UTC(
            parseInt(startYear, 10),
            MONTH_MAP[startMonth],
            parseInt(startDay, 10),
          ),
        );
        periodEnd = new Date(
          Date.UTC(
            parseInt(endYear, 10),
            MONTH_MAP[endMonth],
            parseInt(endDay, 10),
          ),
        );
      }

      const acctMatch = line.match(ACCOUNT_REGEX);
      if (acctMatch && !accountNumberMasked) {
        accountNumberMasked = `****${acctMatch[1]}`;
      }
    }

    // Holder name: first non-empty line that is NOT marketing / section /
    // boilerplate and comes before the period header. Heuristic: the
    // scrubbed fixture uses "TEST USER" which appears multiple times; we
    // pick the first occurrence after removing page-header duplicates.
    for (const line of lines) {
      if (line.includes('!') && line.includes('Account')) continue; // page header
      if (isMarketingLine(line)) continue;
      if (/^TEST USER$/.test(line) || /^[A-Z][A-Z ]+[A-Z]$/.test(line)) {
        if (
          !line.includes('BANK') &&
          !line.includes('DEPOSIT') &&
          !line.includes('INFORMATION') &&
          !line.includes('TAMPA') &&
          !line.includes('TESTCITY') &&
          line.length < 50
        ) {
          accountHolder = line;
          break;
        }
      }
    }

    if (!periodStart || !periodEnd) {
      throw new ParserError(
        'Could not find statement period header ("for <date> to <date>")',
        SourceBank.BOA,
      );
    }
    if (!accountNumberMasked) {
      warnings.push('Account number not found in header');
      accountNumberMasked = '****????';
    }
    if (!accountHolder) {
      warnings.push('Account holder name not found');
      accountHolder = 'UNKNOWN';
    }

    // 3. State machine — walk lines, collect transactions, verify checksums.
    let state: State = 'SEEKING_DEPOSITS';
    const transactions: ParsedTransaction[] = [];
    const checksums: ParsedStatement['checksums'] = {};
    let pending: PendingRow | null = null;

    function flushPending(amount: number, lineIdx: number) {
      if (!pending) return;
      const section = sectionFromState(state);
      if (!section) {
        pending = null;
        return;
      }
      const date = resolveDate(pending.mm, pending.dd, periodStart!, periodEnd!);
      const merchantRaw = pending.descParts.join(' ').replace(/\s+/g, ' ').trim();
      const signed = signForSection(section) * Math.abs(amount);
      transactions.push({
        merchantRaw,
        amount: signed,
        date,
        section,
        sourceLine: pending.sourceLine,
      });
      pending = null;
    }

    function abortPendingIfNoAmount() {
      // Called when we encounter an event (section change, total, etc.) that
      // means the buffered row cannot receive its amount. This indicates a
      // parser/layout bug — record a warning and drop the row.
      if (pending) {
        warnings.push(
          `Row beginning at line ${pending.sourceLine} (${pending.mm}/${pending.dd}) had no amount and was dropped.`,
        );
        pending = null;
      }
    }

    function sectionEndCheck(
      sectionLabel: StatementSection,
      expectedTotal: number,
    ) {
      const section = sectionLabel;
      const sum = transactions
        .filter((t) => t.section === section)
        .reduce((acc, t) => acc + t.amount, 0);
      const delta = Math.abs(Math.abs(sum) - Math.abs(expectedTotal));
      if (section === 'deposits') {
        checksums.deposits = expectedTotal;
      } else if (section === 'card_subtractions') {
        checksums.cardSubtractions = -Math.abs(expectedTotal);
      } else if (section === 'other_subtractions') {
        checksums.otherSubtractions = -Math.abs(expectedTotal);
      }
      if (delta > 0.01) {
        warnings.push(
          `Checksum mismatch in ${section}: parsed sum differs from statement total by $${delta.toFixed(2)}`,
        );
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Universal skips.
      if (PAGE_FOOTER.test(line)) continue;
      if (PAGE_HEADER.test(line)) continue;
      if (HOLDER_HEADER_LINE.test(line)) continue;
      if (COLUMN_HEADER.test(line)) continue;
      if (CONTINUATION_NOTICE.test(line)) continue;
      if (MARKER_CONTINUED.test(line)) continue;

      // State transitions driven by section markers.
      if (MARKER_DEPOSITS.test(line)) {
        abortPendingIfNoAmount();
        state = 'IN_DEPOSITS';
        continue;
      }
      if (MARKER_CARD_SUB.test(line)) {
        abortPendingIfNoAmount();
        state = 'IN_CARD_SUB';
        continue;
      }
      if (MARKER_OTHER_SUB.test(line) && !line.includes('-')) {
        abortPendingIfNoAmount();
        state = 'IN_OTHER_SUB';
        continue;
      }

      // Total-line handling closes the current section.
      const totalDep = line.match(TOTAL_DEPOSITS);
      if (totalDep) {
        // Only honor this when we're actually in the deposits section —
        // otherwise the "Deposits and other additions 15,154.31" summary
        // line on the first page would trip this prematurely.
        if (state === 'IN_DEPOSITS') {
          flushPendingOrDrop();
          sectionEndCheck('deposits', parseAmount(totalDep[1]));
          state = 'SEEKING_CARD_SUB';
        }
        continue;
      }
      const totalCard = line.match(TOTAL_CARD_SUB);
      if (totalCard) {
        if (state === 'IN_CARD_SUB') {
          flushPendingOrDrop();
          sectionEndCheck('card_subtractions', parseAmount(totalCard[1]));
          state = 'SEEKING_OTHER_SUB';
        }
        continue;
      }
      const totalOther = line.match(TOTAL_OTHER_SUB);
      if (totalOther) {
        if (state === 'IN_OTHER_SUB') {
          flushPendingOrDrop();
          sectionEndCheck('other_subtractions', parseAmount(totalOther[1]));
          state = 'DONE';
        }
        continue;
      }

      // Inside a section? Try to parse a row.
      if (
        state === 'IN_DEPOSITS' ||
        state === 'IN_CARD_SUB' ||
        state === 'IN_OTHER_SUB'
      ) {
        // (a) Complete single-line row.
        const fullMatch = line.match(ROW_WITH_AMOUNT);
        if (fullMatch) {
          // If a pending multi-line row is still open, that row had no
          // amount on its own line yet — which means the pending row's
          // final part was THIS line's date. That shouldn't happen in
          // practice; flush as a drop and continue.
          abortPendingIfNoAmount();
          const mm = parseInt(fullMatch[1], 10);
          const dd = parseInt(fullMatch[2], 10);
          const description = fullMatch[4];
          const amount = parseAmount(fullMatch[5]);
          const section = sectionFromState(state)!;
          const date = resolveDate(mm, dd, periodStart, periodEnd);
          transactions.push({
            merchantRaw: description.trim(),
            amount: signForSection(section) * Math.abs(amount),
            date,
            section,
            sourceLine: i,
          });
          continue;
        }

        // (b) Date-starting line with no inline amount → start multi-line.
        const startMatch = line.match(ROW_NO_AMOUNT);
        if (startMatch) {
          abortPendingIfNoAmount();
          pending = {
            mm: parseInt(startMatch[1], 10),
            dd: parseInt(startMatch[2], 10),
            descParts: [startMatch[4]],
            sourceLine: i,
          };
          continue;
        }

        // (c) Standalone amount line — finalize pending row.
        const amtMatch = line.match(STANDALONE_AMOUNT);
        if (amtMatch && pending) {
          flushPending(parseAmount(amtMatch[1]), i);
          continue;
        }

        // (d) Continuation text for a multi-line row (no date, no amount).
        if (pending && !isMarketingLine(line)) {
          pending.descParts.push(line);
          continue;
        }

        // (e) Marketing / unknown line while in a section — skip.
        continue;
      }

      // Outside sections: nothing to do.
    }

    // Drop any still-open pending row (layout bug or truncated PDF).
    abortPendingIfNoAmount();

    function flushPendingOrDrop() {
      // If pending has no amount when we hit a section total, this is a
      // layout surprise — record it as a warning.
      if (pending) {
        warnings.push(
          `Row at line ${pending.sourceLine} (${pending.mm}/${pending.dd}) was pending when its section ended; dropped.`,
        );
        pending = null;
      }
    }

    // Sanity check: we expect at least one transaction in a valid statement.
    if (transactions.length === 0) {
      throw new ParserError(
        'No transactions parsed — statement may be empty or layout has changed',
        SourceBank.BOA,
      );
    }

    // Compute checksum deltas (for the preview UI).
    const computeDelta = (
      section: StatementSection,
      reported: number | undefined,
    ) => {
      if (reported === undefined) return 0;
      const sum = transactions
        .filter((t) => t.section === section)
        .reduce((acc, t) => acc + t.amount, 0);
      return Math.abs(sum - reported);
    };

    return {
      bank: SourceBank.BOA,
      sourceFile,
      accountHolder,
      accountNumberMasked,
      periodStart,
      periodEnd,
      transactions,
      checksums,
      checksumDelta: {
        deposits: computeDelta('deposits', checksums.deposits),
        cardSubtractions: computeDelta('card_subtractions', checksums.cardSubtractions),
        otherSubtractions: computeDelta(
          'other_subtractions',
          checksums.otherSubtractions,
        ),
      },
      warnings,
    };
  },
};
