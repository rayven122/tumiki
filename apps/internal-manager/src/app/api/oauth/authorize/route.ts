import { NextResponse, type NextRequest } from "next/server";
import { getJackson } from "@/server/jackson";

/**
 * OIDC IdP の認可エンドポイント
 *
 * アプリ（Auth.js）からの authorize リクエストを受け、
 * 顧客 IdP（SAML or OIDC）にリダイレクトする。
 */
export const GET = async (req: NextRequest) => {
  const { oauthController } = await getJackson();
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  const result = await oauthController.authorize(
    params as unknown as Parameters<typeof oauthController.authorize>[0],
  );

  if ("redirect_url" in result && result.redirect_url) {
    return NextResponse.redirect(result.redirect_url);
  }

  if ("authorize_form" in result && result.authorize_form) {
    return new NextResponse(result.authorize_form, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return NextResponse.json({ error: "invalid_request" }, { status: 400 });
};

export const dynamic = "force-dynamic";
