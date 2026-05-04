import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/auth";
import { ensureJackson } from "~/server/jackson/route-helpers";
import { Role } from "@tumiki/internal-db";

/**
 * Google Workspace Directory Sync OAuth コールバック
 *
 * 認可フロー:
 * 1. UI から `directorySyncController.google.generateAuthorizationUrl({directoryId})`
 *    を呼び、Google の同意画面 URL を取得 → 管理者をリダイレクト
 * 2. Google が承認後、本エンドポイントへ ?code=...&state=<JSON> を返す
 *    - state は Jackson が `JSON.stringify({ directoryId })` で生成する
 * 3. `getAccessToken` で code → token 交換、`setToken` で Directory に紐付け保存
 * 4. 以降 Jackson が cron で Google Directory API を pull → event-handler へ
 *
 * セキュリティ:
 * - Jackson は state に CSRF nonce を含めないため、本エンドポイントで
 *   SYSTEM_ADMIN セッションを必須とする（攻撃者が任意の code を投入できない）
 * - 詳細エラーは console に記録し、外部には RFC 6749 風の error コードのみ返す
 *   （/admin/settings に scim_error クエリ付きでリダイレクト）
 */

const SETTINGS_PATH = "/admin/settings";

const redirectWithError = (req: NextRequest, code: string) =>
  NextResponse.redirect(
    new URL(
      `${SETTINGS_PATH}?scim_error=${encodeURIComponent(code)}`,
      req.nextUrl.origin,
    ),
  );

export const GET = async (req: NextRequest) => {
  // CSRF 対策: SYSTEM_ADMIN として認証されたセッションを要求
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SYSTEM_ADMIN) {
    console.warn("[google-callback] unauthenticated callback access");
    return redirectWithError(req, "unauthorized");
  }

  const ensured = await ensureJackson();
  if (!ensured.ok) return ensured.response;

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    console.warn("[google-callback] oauth error from google:", oauthError);
    return redirectWithError(req, "oauth_denied");
  }

  if (!code || !state) {
    console.warn("[google-callback] missing code or state");
    return redirectWithError(req, "invalid_request");
  }

  // state は Jackson が JSON.stringify({ directoryId }) で生成するため parse して取り出す
  let directoryId: string;
  try {
    const parsed: unknown = JSON.parse(state);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { directoryId?: unknown }).directoryId !== "string"
    ) {
      throw new Error("state does not contain directoryId");
    }
    directoryId = (parsed as { directoryId: string }).directoryId;
  } catch (e) {
    console.warn("[google-callback] invalid state format:", e);
    return redirectWithError(req, "invalid_state");
  }

  const { directorySyncController } = ensured.jackson;

  const tokenRes = await directorySyncController.google.getAccessToken({
    directoryId,
    code,
  });
  if (tokenRes.error || !tokenRes.data) {
    console.error("[google-callback] token exchange failed:", tokenRes.error);
    return redirectWithError(req, "token_exchange_failed");
  }

  const setRes = await directorySyncController.google.setToken({
    directoryId,
    accessToken: tokenRes.data.access_token,
    refreshToken: tokenRes.data.refresh_token,
  });
  if (setRes.error) {
    console.error("[google-callback] token persist failed:", setRes.error);
    return redirectWithError(req, "token_persist_failed");
  }

  // 認可完了 → 設定画面へ戻す
  return NextResponse.redirect(
    new URL(
      `${SETTINGS_PATH}?scim_success=google_authorized`,
      req.nextUrl.origin,
    ),
  );
};
