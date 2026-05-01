import { NextResponse, type NextRequest } from "next/server";
import { ensureJackson, oauthError } from "@/server/jackson/route-helpers";

/**
 * SAML SP の ACS（Assertion Consumer Service）エンドポイント
 *
 * 顧客 SAML IdP（Google Workspace / Okta SAML / Entra SAML 等）が
 * 認証完了後に SAML Response を POST してくる。
 * jackson が SAML を OIDC ID Token に変換し、アプリにリダイレクトする。
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

  try {
    const samlResult = await oauthController.samlResponse(
      params as unknown as Parameters<typeof oauthController.samlResponse>[0],
    );

    if ("redirect_url" in samlResult && samlResult.redirect_url) {
      return NextResponse.redirect(samlResult.redirect_url, { status: 302 });
    }

    if ("response_form" in samlResult && samlResult.response_form) {
      return new NextResponse(samlResult.response_form, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return oauthError("saml/acs", "no redirect_url");
  } catch (e) {
    return oauthError("saml/acs", e);
  }
};

export const dynamic = "force-dynamic";
