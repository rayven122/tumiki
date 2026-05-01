import { NextResponse, type NextRequest } from "next/server";
import { getJackson } from "@/server/jackson";

/**
 * SAML SP の ACS（Assertion Consumer Service）エンドポイント
 *
 * 顧客 SAML IdP（Google Workspace / Okta SAML / Entra SAML 等）が
 * 認証完了後に SAML Response を POST してくる。
 * jackson が SAML を OIDC ID Token に変換し、アプリにリダイレクトする。
 */
export const POST = async (req: NextRequest) => {
  const { oauthController } = await getJackson();
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }

  try {
    const result = await oauthController.samlResponse(
      params as unknown as Parameters<typeof oauthController.samlResponse>[0],
    );

    if ("redirect_url" in result && result.redirect_url) {
      return NextResponse.redirect(result.redirect_url, { status: 302 });
    }

    if ("response_form" in result && result.response_form) {
      return new NextResponse(result.response_form, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "saml_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const dynamic = "force-dynamic";
