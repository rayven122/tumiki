import { NextResponse } from "next/server";
import { ensureJacksonOidcClients } from "~/server/jackson/oidc-clients";

/** Desktop 用 OIDC 設定エンドポイント。Desktop は public client + PKCE で認証する。 */
export const GET = async () => {
  const env = await ensureJacksonOidcClients();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_DESKTOP_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
