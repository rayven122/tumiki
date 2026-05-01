import { NextResponse, type NextRequest } from "next/server";
import { getJackson } from "@/server/jackson";

/**
 * OIDC Connection のコールバックエンドポイント
 *
 * 顧客 OIDC IdP（Keycloak / Dex / Okta OIDC / Entra OIDC 等）が
 * 認証完了後にコールバックしてくる。
 * jackson が OIDC レスポンスを正規化してアプリにリダイレクトする。
 */
export const GET = async (req: NextRequest) => {
  const { oauthController } = await getJackson();
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  try {
    const result = await oauthController.oidcAuthzResponse(
      params as unknown as Parameters<typeof oauthController.oidcAuthzResponse>[0],
    );

    if ("redirect_url" in result && result.redirect_url) {
      return NextResponse.redirect(result.redirect_url, { status: 302 });
    }

    return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "oidc_error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export const dynamic = "force-dynamic";
