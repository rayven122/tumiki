/**
 * OAuth Callbackエンドポイント
 * GET /api/oauth/callback?code=xxx&state=yyy
 *
 * OAuth認証後のコールバックを処理してトークンを取得・保存
 */

import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
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
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/signin?error=Unauthorized");
    }

    const searchParams = request.nextUrl.searchParams;

    // パラメータ検証
    const paramsResult = validateCallbackParams(searchParams);
    if ("error" in paramsResult) {
      redirect(`/?error=${paramsResult.error}`);
    }
    const { state } = paramsResult;

    // tRPC APIを呼び出してOAuthコールバックを処理
    const result = await api.v2.userMcpServer.handleOAuthCallback({
      state,
      currentUrl: request.nextUrl.toString(),
    });

    // 結果に応じてリダイレクト
    if (result.success) {
      redirect(
        `/${result.organizationSlug}/mcps?success=OAuth+authentication+completed`,
      );
    } else {
      redirect(
        `/${result.organizationSlug}/mcps?error=${encodeURIComponent(
          result.error ?? "Unknown error",
        )}`,
      );
    }
  } catch (error) {
    console.error("[OAuth Callback Error]", error);
    redirect(
      `/?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unknown error",
      )}`,
    );
  }
};
