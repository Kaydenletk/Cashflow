import { NextResponse } from "next/server";

import { answerChat } from "@/lib/chat";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      symbol?: string;
      question?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!body.symbol || !body.question) {
      return NextResponse.json({ error: "Missing symbol or question" }, { status: 400 });
    }

    const answer = await answerChat(body.symbol, body.question, body.history ?? []);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to answer" },
      { status: 500 }
    );
  }
}
