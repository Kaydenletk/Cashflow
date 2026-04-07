import { NextResponse } from "next/server";

import { getMarketPulse } from "@/lib/data/market";

export async function GET() {
  try {
    const data = await getMarketPulse();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load market pulse" },
      { status: 500 }
    );
  }
}
