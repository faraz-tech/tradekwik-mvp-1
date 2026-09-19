import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard: requires the API's `token` cookie.
 * (Shares the host in dev — localhost; in prod the API sets Domain=.tradekwik.com.)
 * The cookie is httpOnly and verified by the API on every request; this check
 * only handles routing UX, never authorization.
 */
export function middleware(request: NextRequest) {
  const hasToken = request.cookies.has("token");
  const path = request.nextUrl.pathname;
  const isLogin = path === "/login" || path === "/register" || path === "/admin-access";

  if (!hasToken && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasToken && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
