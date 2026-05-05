import { NextResponse } from "next/server";
import { ensureJacksonOidcClients } from "~/server/jackson/oidc-clients";

/**
 * Desktop 用 OIDC 設定エンドポイント。
 * 未認証状態の Desktop が組織サインイン開始前に呼ぶ公開 API。
 * public client の client_id と issuer URL のみ返し、機密情報は返さない。
 */
export const GET = async () => {
  const env = await ensureJacksonOidcClients();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_DESKTOP_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
