import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const expected = await getExpectedAuthToken();
  if (!expected) return NextResponse.next(); // APP_PASSWORD not set — auth disabled

  const { pathname } = request.nextUrl;

  // The login page and the endpoint that issues the auth cookie must stay
  // reachable while unauthenticated, or nobody could ever log in.
  if (pathname === "/login" || pathname === "/api/auth/login") return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie === expected) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
