import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearSessionCookie(request));
  return res;
}
