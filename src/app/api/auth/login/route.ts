import { NextResponse } from "next/server";
import {
  authenticateUser,
  buildSessionCookie,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const user = await authenticateUser(body.email || "", body.password || "");
    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ user });
    res.headers.set("Set-Cookie", buildSessionCookie(token, request));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
