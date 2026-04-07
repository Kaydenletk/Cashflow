import { NextResponse } from "next/server";

import { runBacktest } from "@/lib/data/compose";
import { DEFAULT_SCANNER_UNIVERSE } from "@/lib/data/universe";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { symbols?: string[] };
    const symbols = body.symbols?.length ? body.symbols : DEFAULT_SCANNER_UNIVERSE.slice(0, 6);
    const report = await runBacktest(symbols);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run backtest" },
      { status: 500 }
    );
  }
}
