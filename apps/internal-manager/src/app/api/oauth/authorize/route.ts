import { NextResponse, type NextRequest } from "next/server";
import {
  ensureJackson,
  htmlFormResponse,
  oauthError,
} from "@/server/jackson/route-helpers";

/**
 * OIDC IdP の認可エンドポイント
 *
 * アプリ（Auth.js）からの authorize リクエストを受け、
 * 顧客 IdP（SAML or OIDC）にリダイレクトする。
 */
export const GET = async (req: NextRequest) => {
  const result = await ensureJackson();
  if (!result.ok) return result.response;
  const { oauthController } = result.jackson;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  try {
    const authResult = await oauthController.authorize(
      params as unknown as Parameters<typeof oauthController.authorize>[0],
    );

    if ("redirect_url" in authResult && authResult.redirect_url) {
      return NextResponse.redirect(authResult.redirect_url);
    }

    if ("authorize_form" in authResult && authResult.authorize_form) {
      return htmlFormResponse(authResult.authorize_form);
    }

    return oauthError("oauth/authorize", "no redirect_url");
  } catch (e) {
    return oauthError("oauth/authorize", e);
  }
};

export const dynamic = "force-dynamic";
