import { NextResponse } from "next/server";

import { getScanner } from "@/lib/data/compose";
import { DEFAULT_SCANNER_UNIVERSE } from "@/lib/data/universe";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbols = url.searchParams.get("symbols")?.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
    const scanner = await getScanner(symbols?.length ? symbols : DEFAULT_SCANNER_UNIVERSE);
    return NextResponse.json({ rows: scanner });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load scanner" },
      { status: 500 }
    );
  }
}
