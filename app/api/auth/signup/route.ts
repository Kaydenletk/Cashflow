import { NextResponse } from "next/server";

import { createUser, encodeSession, getSessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await createUser(body.name, body.email, body.password);
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
      { error: error instanceof Error ? error.message : "Unable to sign up" },
      { status: 400 }
    );
  }
}
