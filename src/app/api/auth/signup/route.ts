import { NextResponse } from "next/server";
import {
  buildSessionCookie,
  createSessionToken,
  registerUser,
} from "@/lib/auth";
import {
  ensureDefaultLampHighlight,
  migrateLegacyDataToUser,
} from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      church?: string;
      inviteCode?: string;
      ownerSetupKey?: string;
    };

    const { user, isFirstUser } = await registerUser({
      email: body.email || "",
      password: body.password || "",
      displayName: body.displayName || "",
      church: body.church,
      inviteCode: body.inviteCode,
      ownerSetupKey: body.ownerSetupKey,
    });

    if (isFirstUser) {
      await migrateLegacyDataToUser(user.id);
    }
    await ensureDefaultLampHighlight(user.id);

    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ user }, { status: 201 });
    res.headers.set("Set-Cookie", buildSessionCookie(token, request));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
