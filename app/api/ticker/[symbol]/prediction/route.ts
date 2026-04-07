import { NextResponse } from "next/server";

import { getPrediction } from "@/lib/data/compose";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  try {
    const params = await context.params;
    const prediction = await getPrediction(params.symbol);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load prediction" },
      { status: 500 }
    );
  }
}
