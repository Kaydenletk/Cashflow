import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/data/compose";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  try {
    const params = await context.params;
    const snapshot = await getSnapshot(params.symbol);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load snapshot" },
      { status: 500 }
    );
  }
}
