import { NextResponse } from "next/server";
import {
  authenticateOrRegisterGoogleUser,
  buildSessionCookie,
  createSessionToken,
  getGoogleOAuthConfig,
} from "@/lib/auth";
import { migrateLegacyDataToUser } from "@/lib/storage";
import { OAUTH_STATE_COOKIE } from "../route";

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function decodeBase64Url(b64: string): string {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function buildClearStateCookie(request: Request): string {
  const isHttps = request.url.startsWith("https://");
  return [
    `${OAUTH_STATE_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

function redirectWithError(
  origin: string,
  message: string,
  request: Request
): NextResponse {
  const res = NextResponse.redirect(
    `${origin}/?authError=${encodeURIComponent(message)}`
  );
  res.headers.append("Set-Cookie", buildClearStateCookie(request));
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cfg = getGoogleOAuthConfig();

  if (!cfg) {
    return redirectWithError(
      origin,
      "Google Sign-In is not configured on this server.",
      request
    );
  }

  const googleError = url.searchParams.get("error");
  if (googleError) {
    return redirectWithError(
      origin,
      "Google sign-in was cancelled or denied.",
      request
    );
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const rawStateCookie = parseCookie(
    request.headers.get("cookie"),
    OAUTH_STATE_COOKIE
  );

  if (!code || !returnedState || !rawStateCookie) {
    return redirectWithError(
      origin,
      "Your Google sign-in session expired. Please try again.",
      request
    );
  }

  let parsedState: {
    nonce?: string;
    inviteCode?: string;
    ownerSetupKey?: string;
  };
  try {
    parsedState = JSON.parse(decodeBase64Url(rawStateCookie)) as {
      nonce?: string;
      inviteCode?: string;
      ownerSetupKey?: string;
    };
  } catch {
    return redirectWithError(origin, "Invalid sign-in state. Please try again.", request);
  }

  if (!parsedState.nonce || parsedState.nonce !== returnedState) {
    return redirectWithError(
      origin,
      "Security check failed for Google sign-in. Please try again.",
      request
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
      error_description?: string;
    } | null;

    if (!tokenRes.ok || !tokenJson?.access_token) {
      return redirectWithError(
        origin,
        tokenJson?.error_description || "Could not verify Google authorization.",
        request
      );
    }

    const userInfoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: "application/json",
        },
      }
    );

    const profile = (await userInfoRes.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    } | null;

    if (
      !userInfoRes.ok ||
      !profile?.sub ||
      !profile?.email ||
      !profile.email_verified
    ) {
      return redirectWithError(
        origin,
        "Your Google account must have a verified email address to sign in.",
        request
      );
    }

    const { user, isFirstUser } = await authenticateOrRegisterGoogleUser({
      email: profile.email,
      displayName: profile.name || profile.email.split("@")[0],
      googleSub: profile.sub,
      inviteCode: parsedState.inviteCode,
      ownerSetupKey: parsedState.ownerSetupKey,
    });

    if (isFirstUser) {
      await migrateLegacyDataToUser(user.id);
    }

    const token = await createSessionToken(user.id);
    const res = NextResponse.redirect(`${origin}/`);
    res.headers.append("Set-Cookie", buildClearStateCookie(request));
    res.headers.append("Set-Cookie", buildSessionCookie(token, request));
    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google sign-in failed.";
    return redirectWithError(origin, message, request);
  }
}
