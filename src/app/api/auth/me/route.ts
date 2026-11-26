import { NextResponse } from "next/server";
import {
  getAuthSettings,
  getConfiguredOwnerSetupKey,
  getSessionUser,
  getUserCount,
  listAllProfiles,
  updateAuthSettings,
  updateUserProfile,
} from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const [user, userCount, authSettings] = await Promise.all([
      getSessionUser(request),
      getUserCount(),
      getAuthSettings(),
    ]);

    const base = {
      user,
      userCount,
      inviteRequired: userCount > 0 && Boolean(authSettings.inviteCode),
      ownerSetupRequired: userCount === 0 && Boolean(getConfiguredOwnerSetupKey()),
    };

    if (user?.role === "admin") {
      const members = await listAllProfiles();
      return NextResponse.json({
        ...base,
        members,
        inviteCode: authSettings.inviteCode || "",
      });
    }

    return NextResponse.json(base);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as {
      displayName?: string;
      church?: string;
      inviteCode?: string;
    };

    let updatedUser = user;
    if (body.displayName !== undefined || body.church !== undefined) {
      const next = await updateUserProfile(user.id, {
        displayName: body.displayName,
        church: body.church,
      });
      if (next) updatedUser = next;
    }

    let nextInviteCode: string | undefined;
    if (body.inviteCode !== undefined && user.role === "admin") {
      const saved = await updateAuthSettings({ inviteCode: body.inviteCode });
      nextInviteCode = saved.inviteCode || "";
    }

    return NextResponse.json({
      user: updatedUser,
      ...(nextInviteCode !== undefined ? { inviteCode: nextInviteCode } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
