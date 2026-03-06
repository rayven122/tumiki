import { type NextRequest, NextResponse } from "next/server";
import { URL_HEADER_KEY } from "./lib/constants/url";
import { maintenanceProxy } from "./server/lib/proxy/maintenanceProxy";
import { authProxy } from "./server/lib/proxy/authProxy";

/**
 * メインのプロキシミドルウェア
 * 各プロキシ関数を順番に実行し、リダイレクトやレスポンスが返された場合はそれを返す
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns NextResponse
 */
export async function proxy(request: NextRequest) {
  // URLヘッダーを設定
  request.headers.set(URL_HEADER_KEY, request.url);

  // 1. メンテナンスモードチェック
  const maintenanceResponse = maintenanceProxy(request);
  if (maintenanceResponse) return maintenanceResponse;

  // 2. 認証チェック（Auth.js API routesのスキップを含む）
  const authResponse = await authProxy(request);
  if (authResponse) return authResponse;

  // すべてのチェックを通過した場合は通過
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
