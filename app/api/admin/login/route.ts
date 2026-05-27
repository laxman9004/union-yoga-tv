import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminAuthRequired,
  createAdminSessionValue,
  verifyAdminPassword,
} from "@/lib/auth/admin";

export async function POST(request: Request) {
  if (!adminAuthRequired()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = await createAdminSessionValue();
  if (!token) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
