import { NextResponse } from "next/server";
import { getJackson } from "@/server/jackson";

/**
 * OIDC Discovery エンドポイント
 *
 * /.well-known/openid-configuration の rewrite 先。
 * アプリ（Auth.js）と Desktop アプリが saml-jackson の OIDC IdP を
 * 自動検出するために使う。
 */
export const GET = async () => {
  const { oidcDiscoveryController } = await getJackson();
  const config = oidcDiscoveryController.openidConfig();
  return NextResponse.json(config);
};

export const dynamic = "force-dynamic";
