import { NextResponse, type NextRequest } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/admin";

// Public routes that never require a session.
const PUBLIC_PATHS = ["/login", "/privacy", "/terms", "/favicon.ico"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page: if the user already has a valid session, send them to dashboard.
  if (pathname === "/login") {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const decoded = await verifySessionCookie(sessionCookie);
      if (decoded && (decoded.role === "admin" || decoded.role === "medical")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // All other dashboard/API routes require a valid session.
  if (!PUBLIC_PATHS.includes(pathname)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return redirectToLogin(request);
    }

    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded) {
      return redirectToLogin(request);
    }

    const role = decoded.role;
    if (role !== "admin" && role !== "medical") {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except API routes (which handle their own auth),
  // static assets, and the login page.
  matcher: ["/", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
