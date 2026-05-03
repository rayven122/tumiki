import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Role } from "@tumiki/internal-db";
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
    // 未ログイン時は NextAuth の signIn エンドポイントへ。
    // 以前は "/" にリダイレクトしていたが、"/" 自体が "/admin" にリダイレクトするため
    // 無限ループが発生していた。
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (
    pathname.startsWith("/admin") &&
    session.user.role !== Role.SYSTEM_ADMIN
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }
};

export const config = {
  matcher: ["/admin/:path*", "/setup"],
};
