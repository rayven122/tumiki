import { type NextRequest, NextResponse } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import { auth0, auth0OAuth } from "@tumiki/auth/server";

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

  // OAuth専用パスの判定
  const isOAuthPath =
    pathname === "/oauth" || // OAuth設定ページ
    pathname.startsWith("/oauth/"); // OAuth認証エンドポイント（例: /oauth/auth/login, /oauth/auth/callback）

  // OAuth専用パスの場合はOAuth専用クライアントを使用
  if (isOAuthPath) {
    return auth0OAuth.middleware(request);
  }

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
