import { NextResponse, type NextRequest } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import { auth0 } from "@tumiki/auth";

// 認証不要のパス定数
const PUBLIC_PATHS = [
  "/",
  "/jp",
  "/about",
  "/pricing",
  "/legal/tokusho",
  "/legal/privacy",
  "/legal/terms",
] as const;

export async function middleware(request: NextRequest) {
  request.headers.set(URL_HEADER_KEY, request.url);
  const pathname = request.nextUrl.pathname;

  // 認証不要のパス判定
  const isPublicPath =
    (PUBLIC_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith("/auth");

  if (isPublicPath) {
    return auth0.middleware(request);
  }

  // 認証必要パスでのセッションチェック
  const session = await auth0.getSession(request);
  if (session) {
    return auth0.middleware(request);
  }

  // 認証されていない場合、Auth0のログイン画面にリダイレクト
  const returnTo = encodeURIComponent(request.url);
  const loginUrl = `/auth/login?returnTo=${returnTo}`;

  return NextResponse.redirect(new URL(loginUrl, request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - logos (logo files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|logos|favicon|demo|public|ogp.png).*)",
  ],
};
