import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/auth";
import { isOidcConfigured } from "~/lib/env";

/** 認証ガード・OIDC未設定リダイレクト（Node.js ランタイムで動作） */
export const proxy = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;

  if (!isOidcConfigured()) {
    if (pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", req.nextUrl.origin));
    }
    return;
  }

  if (pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
};

export const config = {
  matcher: ["/admin/:path*", "/setup"],
};
