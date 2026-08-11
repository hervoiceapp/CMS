import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/admin";

const ADMIN_ONLY_PATHS = ["/feed", "/doctors", "/alerts", "/copilot"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const cookie = request.cookies.get("session")?.value;
  const session = await verifySessionCookie(cookie);
  const role = session?.role;

  const isLogin = path === "/login";

  if (isLogin) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    role !== "admin" &&
    ADMIN_ONLY_PATHS.some((prefix) => path.startsWith(prefix))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
