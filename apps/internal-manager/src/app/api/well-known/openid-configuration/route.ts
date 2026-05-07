import { NextResponse } from "next/server";
import { ensureJackson } from "@/server/jackson/route-helpers";

/**
 * OIDC Discovery エンドポイント
 *
 * /.well-known/openid-configuration の rewrite 先。
 * アプリ（Auth.js）と Desktop アプリが saml-jackson の OIDC IdP を
 * 自動検出するために使う。
 */
export const GET = async () => {
  const result = await ensureJackson();
  if (!result.ok) return result.response;
  const { oidcDiscoveryController } = result.jackson;

  const config = oidcDiscoveryController.openidConfig();
  return NextResponse.json(config);
};

export const dynamic = "force-dynamic";
