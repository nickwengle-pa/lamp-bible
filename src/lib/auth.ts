import { env } from "cloudflare:workers";
import { UserProfile } from "./types";

interface VesselKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
  list?(options?: {
    prefix?: string;
    cursor?: string;
  }): Promise<{
    keys: { name: string }[];
    list_complete?: boolean;
    cursor?: string;
  }>;
}

interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

interface AuthSettings {
  inviteCode?: string;
}

const USERS_KV_KEY = "lamp_users_v1";
const USER_REC_PREFIX = "lamp_user_rec_";
const USERS_MIGRATED_KEY = "lamp_users_migrated_v2";
const AUTH_SETTINGS_KV_KEY = "lamp_auth_settings_v1";
const INTERNAL_SESSION_SECRET_KV_KEY = "lamp_internal_session_secret_v1";
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
let runtimeSessionSecret: string | null = null;

// Per-key in-isolate write queue to serialize competing mutations (uniqueness,
// initial owner assignment, profile edits) so concurrent saves never overwrite each other.
const writeQueues = new Map<string, Promise<unknown>>();

function withSerializedWrite<T>(queueKey: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(queueKey) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  writeQueues.set(queueKey, tail);
  return run;
}

function getKv(): VesselKV | null {
  const cfEnv = env as unknown as { VESSEL_NOTES?: VesselKV };
  return cfEnv?.VESSEL_NOTES ?? null;
}

function getEnvVar(name: string): string | undefined {
  const cfEnv = env as unknown as Record<string, string | undefined>;
  return cfEnv?.[name]?.trim() || process.env[name]?.trim() || undefined;
}

/**
 * Resolves the HMAC session signing secret without ever falling back to a
 * hardcoded public constant or reusing third-party API keys.
 * Uses SESSION_SECRET env var when configured, otherwise generates and
 * persists a cryptographically random 256-bit secret in KV (or runtime memory).
 */
async function getSigningSecret(): Promise<string> {
  const configured = getEnvVar("SESSION_SECRET");
  if (configured && configured.length >= 16) {
    return configured;
  }

  if (runtimeSessionSecret) {
    return runtimeSessionSecret;
  }

  return withSerializedWrite("auth:session_secret", async () => {
    if (runtimeSessionSecret) return runtimeSessionSecret;

    const kv = getKv();
    if (kv) {
      const existing = await kv.get(INTERNAL_SESSION_SECRET_KV_KEY);
      if (existing && existing.length >= 32) {
        runtimeSessionSecret = existing;
        return existing;
      }
    }

    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const generated = toHex(randomBytes);

    if (kv) {
      await kv.put(INTERNAL_SESSION_SECRET_KV_KEY, generated);
    }
    runtimeSessionSecret = generated;
    return generated;
  });
}

export function getConfiguredOwnerSetupKey(): string | null {
  return getEnvVar("OWNER_SETUP_KEY") || getEnvVar("ADMIN_SETUP_KEY") || null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
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
  const secret = await getSigningSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
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

async function listAllKeys(kv: VesselKV, prefix: string): Promise<string[]> {
  if (!kv.list) return [];
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await kv.list({ prefix, cursor });
    for (const k of res.keys || []) {
      names.push(k.name);
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  return names;
}

async function ensureUsersMigrated(kv: VesselKV): Promise<void> {
  if (!kv.list) return;
  const migrated = await kv.get(USERS_MIGRATED_KEY);
  if (migrated === "1") return;

  const raw = await kv.get(USERS_KV_KEY);
  if (raw) {
    try {
      const legacy = JSON.parse(raw) as StoredUser[];
      if (Array.isArray(legacy)) {
        await Promise.all(
          legacy.map((u) =>
            kv.put(`${USER_REC_PREFIX}${u.id}`, JSON.stringify(u))
          )
        );
      }
    } catch {
      // ignore malformed legacy blob
    }
  }
  await kv.put(USERS_MIGRATED_KEY, "1");
}

async function readUsers(): Promise<StoredUser[]> {
  const kv = getKv();
  if (kv) {
    if (kv.list) {
      await ensureUsersMigrated(kv);
      const keys = await listAllKeys(kv, USER_REC_PREFIX);
      if (keys.length === 0) return [];
      const values = await Promise.all(keys.map((k) => kv.get(k)));
      const out: StoredUser[] = [];
      for (const raw of values) {
        if (!raw) continue;
        try {
          out.push(JSON.parse(raw) as StoredUser);
        } catch {
          // skip corrupt entry
        }
      }
      out.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return out;
    }

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

async function saveSingleUser(user: StoredUser, allUsersFallback: StoredUser[]): Promise<void> {
  const kv = getKv();
  if (kv) {
    if (kv.list) {
      await kv.put(`${USER_REC_PREFIX}${user.id}`, JSON.stringify(user));
      await kv.put(USERS_MIGRATED_KEY, "1");
      return;
    }
    await kv.put(USERS_KV_KEY, JSON.stringify(allUsersFallback));
    return;
  }
  memoryUsers = [...allUsersFallback];
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
  ownerSetupKey?: string;
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

  return withSerializedWrite("auth:users", async () => {
    const users = await readUsers();
    const isFirstUser = users.length === 0;

    if (isFirstUser) {
      // Require a one-time owner credential before assigning initial administrator
      // and migrating legacy single-user data.
      const configuredSetupKey = getConfiguredOwnerSetupKey();
      const kv = getKv();
      const hasLegacyData = kv
        ? Boolean(
            (await kv.get("vessel_library_notes_v1")) ||
              (await kv.get("vessel_bible_highlights_v1"))
          )
        : false;

      if (configuredSetupKey) {
        const supplied = (input.ownerSetupKey || "").trim();
        if (!supplied || !timingSafeEqual(supplied, configuredSetupKey)) {
          throw new Error(
            "Valid Owner Setup Key is required to initialize the first administrator account."
          );
        }
      } else if (hasLegacyData) {
        throw new Error(
          "Existing library data detected. Configure OWNER_SETUP_KEY in Cloudflare Worker secrets before claiming the initial Owner account."
        );
      }
    } else {
      const settings = await getAuthSettings();
      if (
        settings.inviteCode &&
        !timingSafeEqual(
          (input.inviteCode || "").trim().toLowerCase(),
          settings.inviteCode.trim().toLowerCase()
        )
      ) {
        throw new Error("Invalid invite code. Ask the group owner for the code.");
      }
    }

    if (users.some((u) => u.email === email)) {
      throw new Error(
        "An account with that email already exists. Try signing in."
      );
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

    const nextUsers = [...users, created];
    await saveSingleUser(created, nextUsers);

    return { user: stripSecrets(created), isFirstUser };
  });
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
  if (!timingSafeEqual(candidateHash, found.passwordHash)) {
    throw new Error("Incorrect password. Please try again.");
  }

  return stripSecrets(found);
}

export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; church?: string }
): Promise<UserProfile | null> {
  return withSerializedWrite("auth:users", async () => {
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    const updated: StoredUser = {
      ...users[idx],
      ...(updates.displayName?.trim()
        ? { displayName: updates.displayName.trim() }
        : {}),
      ...(updates.church !== undefined
        ? { church: updates.church.trim() || undefined }
        : {}),
    };
    users[idx] = updated;

    await saveSingleUser(updated, users);
    return stripSecrets(updated);
  });
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
    if (!timingSafeEqual(sig, expectedSig)) return null;

    const parsed = JSON.parse(fromBase64Url(payloadB64)) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    const kv = getKv();
    if (kv && kv.list) {
      await ensureUsersMigrated(kv);
      const raw = await kv.get(`${USER_REC_PREFIX}${parsed.uid}`);
      if (raw) {
        try {
          return stripSecrets(JSON.parse(raw) as StoredUser);
        } catch {
          return null;
        }
      }
      return null;
    }

    const users = await readUsers();
    const found = users.find((u) => u.id === parsed.uid);
    return found ? stripSecrets(found) : null;
  } catch {
    return null;
  }
}
