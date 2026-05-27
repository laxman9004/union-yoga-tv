import { createHmac, timingSafeEqual } from "crypto";

const SESSION_PAYLOAD = "union-frame-admin-v1";
export const ADMIN_COOKIE = "frame_admin";

function sessionToken(password: string): string {
  return createHmac("sha256", password).update(SESSION_PAYLOAD).digest("hex");
}

export function verifyAdminPassword(attempt: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  try {
    const a = Buffer.from(attempt, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createAdminSessionValue(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sessionToken(password);
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !cookieValue) return false;
  const expected = sessionToken(password);
  try {
    const a = Buffer.from(cookieValue, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function adminAuthRequired(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}
