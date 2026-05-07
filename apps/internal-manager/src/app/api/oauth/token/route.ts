import { NextResponse, type NextRequest } from "next/server";
import { ensureJackson, oauthError } from "@/server/jackson/route-helpers";

/**
 * OIDC IdP のトークンエンドポイント
 *
 * 認可コードを access_token / id_token に交換する。
 * PKCE（code_verifier）に対応しているので Desktop アプリも利用可能。
 */
export const POST = async (req: NextRequest) => {
  const result = await ensureJackson();
  if (!result.ok) return result.response;
  const { oauthController } = result.jackson;

  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  // Authorization Header が来る場合（client credentials）にも対応
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const [clientId, clientSecret] = decoded.split(":");
    if (clientId && clientSecret) {
      params.client_id ??= clientId;
      params.client_secret ??= clientSecret;
    }
  }

  try {
    const tokenResult = await oauthController.token(
      params as unknown as Parameters<typeof oauthController.token>[0],
    );
    return NextResponse.json(tokenResult);
  } catch (e) {
    return oauthError("oauth/token", e, "invalid_grant");
  }
};

export const dynamic = "force-dynamic";
