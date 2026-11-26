import { env } from "cloudflare:workers";
import { UserProfile } from "./types";

interface VesselKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
}

interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

interface AuthSettings {
  inviteCode?: string;
}

const USERS_KV_KEY = "lamp_users_v1";
const AUTH_SETTINGS_KV_KEY = "lamp_auth_settings_v1";
export const SESSION_COOKIE_NAME = "lamp_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

const AVATAR_COLORS = [
  "#9A6B24",
  "#2F6B4F",
  "#3B5B8A",
  "#8A3F4F",
  "#6B4E8A",
  "#7C5A34",
];

let memoryUsers: StoredUser[] = [];
let memoryAuthSettings: AuthSettings = {};

function getKv(): VesselKV | null {
  const cfEnv = env as unknown as { VESSEL_NOTES?: VesselKV };
  return cfEnv?.VESSEL_NOTES ?? null;
}

function getSigningSecret(): string {
  const cfEnv = env as unknown as Record<string, string | undefined>;
  return (
    cfEnv?.SESSION_SECRET?.trim() ||
    cfEnv?.GEMINI_API_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "lamp-bible-dev-session-secret"
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBytes = fromHex(saltHex);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

async function signPayload(payloadB64: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSigningSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return toHex(new Uint8Array(sig));
}

function stripSecrets(u: StoredUser): UserProfile {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    church: u.church,
    role: u.role,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
  };
}

async function readUsers(): Promise<StoredUser[]> {
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(USERS_KV_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredUser[];
    } catch {
      return [];
    }
  }
  return [...memoryUsers];
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  const kv = getKv();
  if (kv) {
    await kv.put(USERS_KV_KEY, JSON.stringify(users));
    return;
  }
  memoryUsers = [...users];
}

export async function getAuthSettings(): Promise<AuthSettings> {
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(AUTH_SETTINGS_KV_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as AuthSettings;
    } catch {
      return {};
    }
  }
  return { ...memoryAuthSettings };
}

export async function updateAuthSettings(next: AuthSettings): Promise<AuthSettings> {
  const cleaned: AuthSettings = {
    inviteCode: next.inviteCode?.trim() || undefined,
  };
  const kv = getKv();
  if (kv) {
    await kv.put(AUTH_SETTINGS_KV_KEY, JSON.stringify(cleaned));
  } else {
    memoryAuthSettings = cleaned;
  }
  return cleaned;
}

export async function listAllProfiles(): Promise<UserProfile[]> {
  const users = await readUsers();
  return users.map(stripSecrets);
}

export async function getUserCount(): Promise<number> {
  const users = await readUsers();
  return users.length;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  church?: string;
  inviteCode?: string;
}): Promise<{ user: UserProfile; isFirstUser: boolean }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (displayName.length < 2) {
    throw new Error("Please enter your name (at least 2 characters).");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const users = await readUsers();
  const isFirstUser = users.length === 0;

  if (!isFirstUser) {
    const settings = await getAuthSettings();
    if (
      settings.inviteCode &&
      (input.inviteCode || "").trim().toLowerCase() !==
        settings.inviteCode.trim().toLowerCase()
    ) {
      throw new Error("Invalid invite code. Ask the group owner for the code.");
    }
  }

  if (users.some((u) => u.email === email)) {
    throw new Error("An account with that email already exists. Try signing in.");
  }

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const passwordSalt = toHex(saltBytes);
  const passwordHash = await hashPassword(password, passwordSalt);

  const created: StoredUser = {
    id: crypto.randomUUID(),
    email,
    displayName,
    church: input.church?.trim() || undefined,
    role: isFirstUser ? "admin" : "member",
    avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
    passwordHash,
    passwordSalt,
  };

  users.push(created);
  await writeUsers(users);

  return { user: stripSecrets(created), isFirstUser };
}

export async function authenticateUser(
  emailRaw: string,
  password: string
): Promise<UserProfile> {
  const email = emailRaw.trim().toLowerCase();
  const users = await readUsers();
  const found = users.find((u) => u.email === email);
  if (!found) {
    throw new Error("No account found with that email.");
  }

  const candidateHash = await hashPassword(password, found.passwordSalt);
  if (candidateHash !== found.passwordHash) {
    throw new Error("Incorrect password. Please try again.");
  }

  return stripSecrets(found);
}

export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; church?: string }
): Promise<UserProfile | null> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;

  if (updates.displayName?.trim()) {
    users[idx].displayName = updates.displayName.trim();
  }
  if (updates.church !== undefined) {
    users[idx].church = updates.church.trim() || undefined;
  }

  await writeUsers(users);
  return stripSecrets(users[idx]);
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = JSON.stringify({
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  });
  const payloadB64 = toBase64Url(payload);
  const sig = await signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function buildSessionCookie(token: string, request: Request): string {
  const isHttps = request.url.startsWith("https://");
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

export function buildClearSessionCookie(request: Request): string {
  const isHttps = request.url.startsWith("https://");
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function getSessionUser(request: Request): Promise<UserProfile | null> {
  const token = parseCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token || !token.includes(".")) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  try {
    const expectedSig = await signPayload(payloadB64);
    if (sig !== expectedSig) return null;

    const parsed = JSON.parse(fromBase64Url(payloadB64)) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    const users = await readUsers();
    const found = users.find((u) => u.id === parsed.uid);
    return found ? stripSecrets(found) : null;
  } catch {
    return null;
  }
}
