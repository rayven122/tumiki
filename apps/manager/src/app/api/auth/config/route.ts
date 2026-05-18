import { NextResponse } from "next/server";
import { getKeycloakEnv } from "~/lib/env";

// env vars を動的に読むため静的キャッシュを無効化
export const dynamic = "force-dynamic";

/**
 * Desktopアプリ向けOIDC設定エンドポイント
 * manager:connect IPC ハンドラーから呼ばれ、OIDC認証フローの初期化に使用される
 */
export const GET = () => {
  const env = getKeycloakEnv();
  return NextResponse.json(
    {
      issuer: env.KEYCLOAK_ISSUER,
      clientId: env.KEYCLOAK_CLIENT_ID,
    },
    // desktop のポーリング負荷を抑制するため 5 分キャッシュ。
    // CDN/プロキシでキャッシュさせると issuer/clientId 変更時に古い値を配信し続けるため
    // private を指定してクライアント側だけキャッシュする
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
};
