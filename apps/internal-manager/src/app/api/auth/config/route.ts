import { NextResponse } from "next/server";
import { getOidcEnv } from "~/lib/env";

/**
 * OIDC設定取得エンドポイント（認証不要）
 *
 * クライアントはこのエンドポイントでissuerと管理サーバー用clientIdを取得し、
 * OIDCディスカバリ経由で認証エンドポイントを動的取得する。
 * 管理サーバーのURLだけ知っていれば認証を開始できる。
 */
export const GET = () => {
  const env = getOidcEnv();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
