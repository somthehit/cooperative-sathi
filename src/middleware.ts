import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nepal_cooperative_super_secret_jwt_key_2083_!@#"
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files/logos)
     * - static file extensions (svg, png, jpg, jpeg, gif, webp, xlsx)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xlsx)$).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public auth endpoints & static org settings
  const isAuthPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/api/settings/org";

  // Check token
  const token = req.cookies.get("coop_session")?.value;
  let user: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      user = payload;
    } catch {
      user = null;
    }
  }

  // If already logged in and visiting /login
  if (pathname === "/login") {
    if (user) {
      const openingStatus = req.cookies.get("coop_opening_status")?.value || "Draft";
      if (openingStatus !== "Posted-Locked" && user.role === "ADMIN") {
        return NextResponse.redirect(new URL("/opening-setup", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isAuthPath) {
    return NextResponse.next();
  }

  // 2. Unauthenticated check
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "कृपया लगइन गर्नुहोस् (Authentication Required)", authenticated: false },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Opening Setup Gatekeeper:
  // "if opening setup chaina bhane suru ma yehi opening setup garer matrai dashboard ma jane"
  const openingStatus = req.cookies.get("coop_opening_status")?.value || "Draft";
  const isOpeningComplete = openingStatus === "Posted-Locked";

  // If opening setup is NOT completed:
  // Must complete opening setup before accessing dashboard or other financial operational pages
  if (!isOpeningComplete) {
    if (pathname !== "/opening-setup" && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/opening-setup", req.url));
    }
  }

  // Root redirect
  if (pathname === "/") {
    if (!isOpeningComplete) {
      return NextResponse.redirect(new URL("/opening-setup", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
