import { NextResponse } from "next/server";

import { authenticateUser, encodeSession, getSessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const user = await authenticateUser(body.email, body.password);
    const response = NextResponse.json({ user });
    response.cookies.set(getSessionCookieName(), encodeSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to log in" },
      { status: 401 }
    );
  }
}
