import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Auth.js v5 のセッションCookieキー（開発: authjs.session-token, 本番: __Secure-authjs.session-token）
const SESSION_COOKIE = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

export const middleware = (req: NextRequest) => {
  const hasSession = SESSION_COOKIE.some((name) => req.cookies.has(name));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
};

export const config = {
  matcher: ["/admin/:path*"],
};
