import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSession, getSessionCookieName } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(getSessionCookieName())?.value);
  return NextResponse.json({ user: session });
}
