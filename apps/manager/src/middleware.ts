import { type NextRequest, NextResponse } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import {
  auth0,
  auth0OAuth,
  getAvailableVerificationUserIds,
  getDefaultVerificationUserId,
  isVerificationModeEnabled,
  validateVerificationMode,
} from "@tumiki/auth/edge";

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
  const pathname = request.nextUrl.pathname;
  request.headers.set(URL_HEADER_KEY, request.url);

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

  // 検証モードチェック
  if (isVerificationModeEnabled()) {
    try {
      validateVerificationMode();

      // Cookie から現在のセッションを確認
      const currentSessionUserId = request.cookies.get(
        "__verification_session",
      )?.value;

      // クエリパラメータからユーザーIDを取得（オプション）
      // パラメータがある場合のみ、それを使用してセッションを更新
      const queryUserId = request.nextUrl.searchParams.get("verification_user");

      // セッション更新が必要なユーザーID
      const verificationUserId =
        queryUserId ?? currentSessionUserId ?? getDefaultVerificationUserId();

      // 利用可能なユーザーIDかチェック
      const availableIds = getAvailableVerificationUserIds();
      if (!availableIds.includes(verificationUserId)) {
        console.warn(
          `[VERIFICATION MODE] Invalid user ID: ${verificationUserId}`,
        );
      } else {
        // セッションがない、または異なるユーザーの場合
        if (currentSessionUserId !== verificationUserId) {
          // 簡易セッション Cookie を設定
          const response = NextResponse.next();
          response.cookies.set("__verification_session", verificationUserId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24, // 24時間
          });

          // コンソールに警告を出力
          console.warn(
            `⚠️  [VERIFICATION MODE] Auto-login as: ${verificationUserId}`,
          );

          return response;
        }
      }
    } catch (error) {
      console.error("[VERIFICATION MODE] Error:", error);
    }
  }

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

  // 検証モードの場合、Cookie セッションを優先
  if (isVerificationModeEnabled()) {
    const verificationUserId = request.cookies.get(
      "__verification_session",
    )?.value;
    if (verificationUserId) {
      // 検証モードのセッションがある場合、認証済みとして扱う
      console.log(
        `[VERIFICATION MODE] Using verification session: ${verificationUserId}`,
      );
      // Auth0 認証をスキップして次に進む
      return NextResponse.next();
    }
  }

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
