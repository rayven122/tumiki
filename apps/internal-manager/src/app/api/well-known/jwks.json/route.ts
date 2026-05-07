import { NextResponse } from "next/server";
import { ensureJackson } from "@/server/jackson/route-helpers";

/**
 * OIDC IdP の JWKS（JSON Web Key Set）公開エンドポイント
 *
 * /.well-known/jwks.json の rewrite 先。
 * アプリ（Auth.js）が ID Token の署名検証に使用する公開鍵を提供する。
 */
export const GET = async () => {
  const result = await ensureJackson();
  if (!result.ok) return result.response;
  const { oidcDiscoveryController } = result.jackson;

  const jwks = await oidcDiscoveryController.jwks();
  return NextResponse.json(jwks);
};

export const dynamic = "force-dynamic";
