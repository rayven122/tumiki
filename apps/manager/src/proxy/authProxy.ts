import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

/**
 * 認証チェックを行うプロキシ
 * Auth.js API routesのスキップと、Auth.jsの公式なミドルウェア用auth関数でセッションをチェックし、
 * 未認証ユーザーをサインインページにリダイレクトする
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns NextResponseまたはnull（処理を続行する場合）
 */
export const authProxy = async (
  request: NextRequest,
): Promise<NextResponse | null> => {
  const pathname = request.nextUrl.pathname;

  // Auth.js API routes（/api/auth/*）は認証チェックをスキップして通過させる
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 公開パスの定義
  const publicPaths = [
    "/",
    "/jp",
    "/about",
    "/pricing",
    "/legal",
    "/error",
    "/signin",
    "/signup",
    "/mock", // モック検証用
  ];

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

  // Auth.jsの公式なミドルウェア用auth関数でセッションチェック
  // JWT strategyを使用しているため、Prismaにアクセスせずにセッション検証が可能
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // 認証が必要なパスで未ログインの場合はサインインページにリダイレクト
  if (!isLoggedIn) {
    const signInUrl = new URL("/signin", request.url);
    // callbackUrlには相対パスのみを設定（セキュリティ向上）
    const callbackPath = request.nextUrl.pathname + request.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", callbackPath);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みの場合は通過
  return NextResponse.next();
};
