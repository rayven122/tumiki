import { NextResponse, type NextRequest } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import { auth0 } from "@tumiki/auth";

export async function middleware(request: NextRequest) {
  request.headers.set(URL_HEADER_KEY, request.url);
  const pathname = request.nextUrl.pathname;

  // 認証不要のパス（/ と /login）
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/auth")
  ) {
    return auth0.middleware(request);
  }

  // 認証必要パスでのセッションチェック
  const session = await auth0.getSession(request);
  if (session) {
    return auth0.middleware(request);
  }

  // 認証されていない場合は /login にリダイレクト
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
