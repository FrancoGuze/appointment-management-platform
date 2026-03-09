import { NextRequest, NextResponse } from "next/server";
import { USER_SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth-session";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  const sessionToken = request.cookies.get(USER_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("auth", "1");
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(sessionToken);

  if (!session) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("auth", "1");
    loginUrl.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/?error=forbidden", request.url));
  }

  if (
    path.startsWith("/professional") &&
    session.role !== "professional" &&
    session.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/?error=forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/professional/:path*", "/history/:path*", "/profile/:path*"],
};
