const SESSION_PAYLOAD = "union-frame-admin-v1";
export const ADMIN_COOKIE = "frame_admin";

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_PAYLOAD)
  );
  return bytesToHex(sig);
}

function timingSafeEqualText(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}

export function verifyAdminPassword(attempt: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqualText(attempt, expected);
}

export async function createAdminSessionValue(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sessionToken(password);
}

export async function isValidAdminSession(
  cookieValue: string | undefined
): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !cookieValue) return false;
  const expected = await sessionToken(password);
  return timingSafeEqualText(cookieValue, expected);
}

export function adminAuthRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}
