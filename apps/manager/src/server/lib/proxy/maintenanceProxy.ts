import { type NextRequest, NextResponse } from "next/server";

/**
 * メンテナンスモードをチェックするプロキシ
 * メンテナンスモード中は、許可されたIPアドレス以外のアクセスを
 * メンテナンスページにリダイレクトする
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns NextResponseまたはnull（処理を続行する場合）
 */
export const maintenanceProxy = (request: NextRequest): NextResponse | null => {
  const pathname = request.nextUrl.pathname;
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const allowedIPs =
    process.env.MAINTENANCE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) ??
    [];

  // クライアントIPの取得
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
    // 許可IPからのアクセスはスキップ（nullを返して次の処理へ）
    if (clientIP && allowedIPs.includes(clientIP)) {
      return null;
    }
    // それ以外はメンテナンスページへリダイレクト
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  return null;
};
