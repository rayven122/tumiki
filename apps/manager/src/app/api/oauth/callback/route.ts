/**
 * OAuth Callbackエンドポイント
 * GET /api/oauth/callback?code=xxx&state=yyy
 *
 * OAuth認証後のコールバックを処理してトークンを取得・保存
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { api } from "@/trpc/server";

/**
 * コールバックパラメータを検証
 */
const validateCallbackParams = (
  searchParams: URLSearchParams,
): { code: string; state: string } | { error: string } => {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[OAuth Callback Error]", error, errorDescription);
    return { error };
  }

  if (!code || !state) {
    return { error: "Missing+code+or+state" };
  }

  return { code, state };
};

export const GET = async (request: NextRequest) => {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=Unauthorized", request.url),
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // パラメータ検証
    const paramsResult = validateCallbackParams(searchParams);
    if ("error" in paramsResult) {
      return NextResponse.redirect(
        new URL(`/?error=${paramsResult.error}`, request.url),
      );
    }
    const { state } = paramsResult;

    // tRPC APIを呼び出してOAuthコールバックを処理
    const result = await api.v2.oauth.handleCallback({
      state,
      currentUrl: request.nextUrl.toString(),
    });

    // 結果に応じてリダイレクト
    if (result.success) {
      return NextResponse.redirect(
        new URL(
          `/${result.organizationSlug}/mcps?success=OAuth+authentication+completed`,
          request.url,
        ),
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/${result.organizationSlug}/mcps?error=${encodeURIComponent(
            result.error ?? "Unknown error",
          )}`,
          request.url,
        ),
      );
    }
  } catch (error) {
    console.error("[OAuth Callback Error]", error);
    const organizationSlug = session.user.organizationSlug;

    // organizationSlugがnullの場合はホームにリダイレクト
    if (!organizationSlug) {
      return NextResponse.redirect(
        new URL("/?error=Missing+organization", request.url),
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.redirect(
      new URL(
        `/${organizationSlug}/mcps?error=${encodeURIComponent(errorMessage)}`,
        request.url,
      ),
    );
  }
};
