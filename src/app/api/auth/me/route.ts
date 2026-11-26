import { NextResponse } from "next/server";
import {
  deleteMemberUser,
  getAuthSettings,
  getConfiguredOwnerSetupKey,
  getGoogleOAuthConfig,
  getSessionUser,
  getUserCount,
  listAllProfiles,
  updateAuthSettings,
  updateUserProfile,
} from "@/lib/auth";
import {
  getCustomTheologyNotes,
  saveCustomTheologyNotes,
} from "@/lib/theology";

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
      googleAuthEnabled: Boolean(getGoogleOAuthConfig()),
    };

    if (user?.role === "admin") {
      const [members, theologyNotes] = await Promise.all([
        listAllProfiles(),
        getCustomTheologyNotes(),
      ]);
      return NextResponse.json({
        ...base,
        members,
        inviteCode: authSettings.inviteCode || "",
        theologyNotes,
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
      theologyNotes?: string;
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

    let nextTheologyNotes: string | undefined;
    if (body.theologyNotes !== undefined && user.role === "admin") {
      nextTheologyNotes = await saveCustomTheologyNotes(body.theologyNotes);
    }

    return NextResponse.json({
      user: updatedUser,
      ...(nextInviteCode !== undefined ? { inviteCode: nextInviteCode } : {}),
      ...(nextTheologyNotes !== undefined
        ? { theologyNotes: nextTheologyNotes }
        : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Owner permission required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId")?.trim();
    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId." }, { status: 400 });
    }

    const removed = await deleteMemberUser(memberId, user.id);
    if (!removed) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const members = await listAllProfiles();
    return NextResponse.json({ ok: true, members });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
