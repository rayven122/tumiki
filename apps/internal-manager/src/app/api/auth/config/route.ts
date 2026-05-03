import { NextResponse } from "next/server";
import { getOidcEnv } from "~/lib/env";

/** OIDC設定エンドポイント。Desktopも管理サーバーのclientIdを使うためOIDC_DESKTOP_CLIENT_IDは持たない。 */
export const GET = () => {
  const env = getOidcEnv();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
