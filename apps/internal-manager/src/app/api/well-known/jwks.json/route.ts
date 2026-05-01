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

  try {
    const jwks = await oidcDiscoveryController.jwks();
    return NextResponse.json(jwks);
  } catch (e) {
    const priv = process.env.JACKSON_OIDC_PRIVATE_KEY ?? "";
    const pub = process.env.JACKSON_OIDC_PUBLIC_KEY ?? "";
    const safeDecode = (s: string) => {
      try {
        return Buffer.from(s, "base64").toString("ascii").split("\n")[0];
      } catch {
        return "<decode-fail>";
      }
    };
    const debug = {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 6) : undefined,
      privLen: priv.length,
      pubLen: pub.length,
      privPrefix: priv.slice(0, 30),
      pubPrefix: pub.slice(0, 30),
      privDecodedFirstLine: safeDecode(priv),
      pubDecodedFirstLine: safeDecode(pub),
    };
    console.error("[jwks debug]", debug);
    return NextResponse.json(debug, { status: 500 });
  }
};

export const dynamic = "force-dynamic";
