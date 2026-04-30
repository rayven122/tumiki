import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isOidcConfigured = () => {
  const required = ["OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_ISSUER"];
  return required.every((key) => (process.env[key] ?? "").length > 0);
};

export const middleware = (req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // /setup と静的アセットは除外
  if (
    pathname.startsWith("/setup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  if (!isOidcConfigured()) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
