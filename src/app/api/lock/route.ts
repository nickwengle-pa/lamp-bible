import { NextResponse } from "next/server";
import { getPinHash, setPinHash } from "@/lib/storage";

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`vessel-pin-v1::${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET() {
  try {
    const stored = await getPinHash();
    return NextResponse.json({ enabled: Boolean(stored) });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "verify" | "set" | "remove";
      pin?: string;
      currentPin?: string;
    };

    const stored = await getPinHash();

    if (body.action === "verify") {
      if (!stored) return NextResponse.json({ ok: true });
      const candidate = await hashPin((body.pin || "").trim());
      if (candidate !== stored) {
        return NextResponse.json(
          { ok: false, error: "Incorrect passcode. Please try again." },
          { status: 401 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set") {
      const nextPin = (body.pin || "").trim();
      if (nextPin.length < 4 || nextPin.length > 12) {
        return NextResponse.json(
          { ok: false, error: "Passcode must be 4 to 12 characters." },
          { status: 400 }
        );
      }
      if (stored) {
        const currentHash = await hashPin((body.currentPin || "").trim());
        if (currentHash !== stored) {
          return NextResponse.json(
            { ok: false, error: "Current passcode is incorrect." },
            { status: 401 }
          );
        }
      }
      const nextHash = await hashPin(nextPin);
      await setPinHash(nextHash);
      return NextResponse.json({ ok: true, enabled: true });
    }

    if (body.action === "remove") {
      if (stored) {
        const currentHash = await hashPin((body.currentPin || "").trim());
        if (currentHash !== stored) {
          return NextResponse.json(
            { ok: false, error: "Current passcode is incorrect." },
            { status: 401 }
          );
        }
      }
      await setPinHash(null);
      return NextResponse.json({ ok: true, enabled: false });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Passcode error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
