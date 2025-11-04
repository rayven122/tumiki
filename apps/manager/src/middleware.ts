import { type NextRequest, NextResponse } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import {
  getAvailableVerificationUserIds,
  getDefaultVerificationUserId,
  isVerificationModeEnabled,
  validateVerificationMode,
} from "~/lib/verification";
import { getSessionToken } from "~/lib/session-utils";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  request.headers.set(URL_HEADER_KEY, request.url);

  // Auth.js API routes は認証チェックをスキップ
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

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

      // 検証モードの場合、Cookie セッションがあれば認証済みとして扱う
      if (currentSessionUserId) {
        console.log(
          `[VERIFICATION MODE] Using verification session: ${currentSessionUserId}`,
        );
        // Auth.js 認証をスキップして次に進む
        return NextResponse.next();
      }
    } catch (error) {
      console.error("[VERIFICATION MODE] Error:", error);
    }
  }

  // ⚠️ セキュリティ上の制限:
  // Database strategy使用時、Edge RuntimeではPrismaにアクセスできないため
  // セッショントークンクッキーの存在のみをチェックしています。
  //
  // 実際のセッション検証は、各保護されたルート（Server Components、API routes等）で
  // auth() を呼び出す際に行われます。middleware はルーティング制御のみを担当します。
  const sessionToken = getSessionToken(request.cookies);
  const isLoggedIn = !!sessionToken;

  const publicPaths = ["/", "/jp", "/about", "/pricing", "/legal", "/error"];
  const isPublicPath = publicPaths.some((path) => {
    if (path === "/legal") {
      return pathname.startsWith(path);
    }
    return pathname === path;
  });

  // 公開パスはそのまま通過
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 認証が必要なパスで未ログインの場合はサインインページにリダイレクト
  if (!isLoggedIn) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みの場合は通過
  return NextResponse.next();
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
