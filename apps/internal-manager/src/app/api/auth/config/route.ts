import { NextResponse } from "next/server";
import { getOidcEnv } from "~/lib/env";

/**
 * Desktop向けOIDC設定取得エンドポイント（認証不要）
 *
 * DesktopはこのエンドポイントでissuerとclientIdを取得し、
 * OIDCディスカバリ経由で認証エンドポイントを動的取得する。
 * 管理サーバーのURLだけ知っていれば認証を開始できる。
 */
export const GET = () => {
  const env = getOidcEnv();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_DESKTOP_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
