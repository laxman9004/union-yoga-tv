import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  adminAuthRequired,
  isValidAdminSession,
} from "@/lib/auth/admin";

const PROTECTED = ["/admin", "/api/data", "/api/copy"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout")
  ) {
    return NextResponse.next();
  }

  const needsAuth = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!needsAuth) return NextResponse.next();

  if (!adminAuthRequired()) {
    if (process.env.NODE_ENV === "production") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Set ADMIN_PASSWORD in environment variables." },
          { status: 503 }
        );
      }
      return NextResponse.redirect(new URL("/admin/login?setup=1", request.url));
    }
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await isValidAdminSession(session)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/data/:path*",
    "/api/copy",
    "/api/copy/:path*",
  ],
};
