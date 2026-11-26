import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/auth";

export const OAUTH_STATE_COOKIE = "lamp_google_oauth_state";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: Request) {
  const cfg = getGoogleOAuthConfig();
  const url = new URL(request.url);
  const origin = url.origin;

  if (!cfg) {
    return NextResponse.redirect(
      `${origin}/?authError=${encodeURIComponent(
        "Google Sign-In is not configured yet on this deployment."
      )}`
    );
  }

  const inviteCode = url.searchParams.get("inviteCode")?.trim() || "";
  const ownerSetupKey = url.searchParams.get("ownerSetupKey")?.trim() || "";

  const nonceBytes = new Uint8Array(24);
  crypto.getRandomValues(nonceBytes);
  const nonce = toHex(nonceBytes);

  // Store nonce + optional invite/setup key in a short-lived HttpOnly cookie
  const stateCookiePayload = JSON.stringify({
    nonce,
    inviteCode,
    ownerSetupKey,
  });
  const encodedCookie = btoa(
    String.fromCharCode(...new TextEncoder().encode(stateCookiePayload))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const redirectUri = `${origin}/api/auth/google/callback`;
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", cfg.clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", nonce);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const isHttps = request.url.startsWith("https://");
  const cookie = [
    `${OAUTH_STATE_COOKIE}=${encodedCookie}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=600",
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");

  const res = NextResponse.redirect(googleAuthUrl.toString());
  res.headers.set("Set-Cookie", cookie);
  return res;
}
