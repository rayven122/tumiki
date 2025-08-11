import { type NextRequest, NextResponse } from "next/server";
import { ONBOARDING_CHECK_HEADER_KEY, URL_HEADER_KEY } from "./constants/url";
import { auth0 } from "@tumiki/auth/edge";

// 認証不要のパス定数
const PUBLIC_PATHS = [
  "/",
  "/jp",
  "/about",
  "/pricing",
  "/legal/tokusho",
  "/legal/privacy",
  "/legal/terms",
  "/test-headers", // テスト用
] as const;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ヘッダーを設定するための新しいヘッダーオブジェクトを作成
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(URL_HEADER_KEY, request.url);

  // メンテナンスモードチェック
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const allowedIPs =
    process.env.MAINTENANCE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) ??
    [];

  // クライアントIPの取得（x-forwarded-forヘッダーまたはx-real-ipを確認）
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIP = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "";

  // メンテナンスページへのアクセス処理
  if (pathname === "/maintenance") {
    // メンテナンスモードでない場合はトップページへリダイレクト
    if (!isMaintenanceMode) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // メンテナンスモード中はページを表示
    return NextResponse.next();
  }

  // メンテナンスモード中の処理
  if (isMaintenanceMode) {
    // 許可IPからのアクセスはすべて通過
    if (clientIP && allowedIPs.includes(clientIP)) {
      // 通常のルーティングに進む
    } else {
      // メンテナンスページへリダイレクト
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // OAuth専用パスの判定
  const isOAuthPath =
    pathname === "/oauth" || // OAuth設定ページ
    pathname.startsWith("/oauth/"); // OAuth認証エンドポイント（例: /oauth/auth/login, /oauth/auth/callback）

  // OAuth専用パスの場合はOAuth専用クライアントを使用
  if (isOAuthPath) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 認証不要のパス判定
  const isPublicPath =
    (PUBLIC_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith("/auth");

  if (isPublicPath) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 認証必要パスでのセッションチェック
  const session = await auth0.getSession(request);
  if (session) {
    // オンボーディングチェックが必要なパスかどうか判定
    // PUBLIC_PATHS + /onboarding 以外のパスはオンボーディングチェックが必要
    const requiresOrganization = ![...PUBLIC_PATHS, "/onboarding"].includes(
      pathname,
    );
    if (requiresOrganization) {
      // リクエストヘッダーにフラグを設定
      requestHeaders.set(ONBOARDING_CHECK_HEADER_KEY, "true");
    }

    // リクエストヘッダーを付与してレスポンスを返す
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
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
