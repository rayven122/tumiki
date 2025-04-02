import { NextResponse } from "next/server";
import { auth } from "./server/auth";

export default auth((req) => {
	if (!req.auth) {
		return NextResponse.redirect(new URL("/login", req.url));
	}
	return NextResponse.next();
});

export const config = {
	/**
	 * ミドルウェアが適用されるパスのマッチャー
	 *
	 * 以下のパスを除外して、それ以外のすべてのパスにミドルウェアを適用:
	 * - /api/* : APIルート
	 * - /_next/static/* : 静的ファイル
	 * - /_next/image/* : 画像最適化用のエンドポイント
	 * - /favicon.ico : ファビコン
	 * - /login : ログインページ
	 */
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
