import { NextResponse } from "next/server";
import { getOidcEnv } from "~/lib/env";

/** Desktop が組織サインインに使う OIDC 設定エンドポイント。 */
export const GET = () => {
  const env = getOidcEnv();
  return NextResponse.json({
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_DESKTOP_CLIENT_ID ?? env.OIDC_CLIENT_ID,
  });
};

export const dynamic = "force-dynamic";
