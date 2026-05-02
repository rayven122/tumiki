import { NextResponse, type NextRequest } from "next/server";
import { ensureJackson, oauthError } from "@/server/jackson/route-helpers";

/**
 * OIDC Connection のコールバックエンドポイント
 *
 * 顧客 OIDC IdP（Keycloak / Dex / Okta OIDC / Entra OIDC 等）が
 * 認証完了後にコールバックしてくる。
 * GET（query string）と POST（form_post response_mode）の両方に対応。
 * jackson が OIDC レスポンスを正規化してアプリにリダイレクトする。
 */
const handle = async (
  params: Record<string, string>,
): Promise<NextResponse> => {
  const result = await ensureJackson();
  if (!result.ok) return result.response;
  const { oauthController } = result.jackson;

  try {
    const oidcResult = await oauthController.oidcAuthzResponse(
      params as unknown as Parameters<
        typeof oauthController.oidcAuthzResponse
      >[0],
    );

    if ("redirect_url" in oidcResult && oidcResult.redirect_url) {
      return NextResponse.redirect(oidcResult.redirect_url, { status: 302 });
    }

    return oauthError("oauth/oidc", "no redirect_url");
  } catch (e) {
    return oauthError("oauth/oidc", e);
  }
};

export const GET = async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return handle(params);
};

export const POST = async (req: NextRequest) => {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }
  return handle(params);
};

export const dynamic = "force-dynamic";
