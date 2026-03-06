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
import { getAppBaseUrl } from "@/lib/url";
import { getSessionInfo } from "~/lib/auth/session-utils";

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
  // Cloudflare Tunnel等のリバースプロキシ環境対応のため、環境変数からベースURLを取得
  const baseUrl = getAppBaseUrl();

  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=Unauthorized", baseUrl),
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // パラメータ検証
    const paramsResult = validateCallbackParams(searchParams);
    if ("error" in paramsResult) {
      return NextResponse.redirect(
        new URL(`/?error=${paramsResult.error}`, baseUrl),
      );
    }
    const { state } = paramsResult;

    // tRPC APIを呼び出してOAuthコールバックを処理
    // Note: State tokenの検証はhandleCallback内部で実行される（verifyOAuthState）
    // currentUrlはトークン交換時に使用するため、環境変数ベースのURLを使用
    const callbackUrl = new URL("/api/oauth/callback", baseUrl);
    callbackUrl.search = request.nextUrl.search;
    const result = await api.oauth.handleCallback({
      state,
      currentUrl: callbackUrl.toString(),
    });

    // 結果に応じてリダイレクト
    if (result.success) {
      // redirectTo が指定されている場合はそちらにリダイレクト（チャット画面等）
      if (result.redirectTo) {
        const redirectUrl = new URL(result.redirectTo, baseUrl);
        redirectUrl.searchParams.set(
          "success",
          "OAuth+authentication+completed",
        );
        return NextResponse.redirect(redirectUrl);
      }
      // デフォルトはMCPサーバー一覧ページ
      return NextResponse.redirect(
        new URL(
          `/${result.organizationSlug}/mcps?success=OAuth+authentication+completed`,
          baseUrl,
        ),
      );
    } else {
      // redirectTo が指定されている場合はそちらにエラーを付けてリダイレクト
      if (result.redirectTo) {
        const redirectUrl = new URL(result.redirectTo, baseUrl);
        redirectUrl.searchParams.set(
          "error",
          encodeURIComponent(result.error ?? "Unknown error"),
        );
        return NextResponse.redirect(redirectUrl);
      }
      const redirectUrl = `/${result.organizationSlug}/mcps?error=${encodeURIComponent(result.error ?? "Unknown error")}`;
      return NextResponse.redirect(new URL(redirectUrl, baseUrl));
    }
  } catch (error) {
    console.error("[OAuth Callback Error]", error);
    const organizationSlug = getSessionInfo(session).organizationSlug;

    // organizationSlugがnullの場合はホームにリダイレクト
    if (!organizationSlug) {
      return NextResponse.redirect(
        new URL("/?error=Missing+organization", baseUrl),
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.redirect(
      new URL(
        `/${organizationSlug}/mcps?error=${encodeURIComponent(errorMessage)}`,
        baseUrl,
      ),
    );
  }
};
