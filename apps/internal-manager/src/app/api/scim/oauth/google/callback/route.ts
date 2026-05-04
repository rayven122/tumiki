import { NextResponse, type NextRequest } from "next/server";
import { ensureJackson } from "~/server/jackson/route-helpers";

/**
 * Google Workspace Directory Sync OAuth コールバック
 *
 * 認可フロー:
 * 1. UI から `directorySyncController.google.generateAuthorizationUrl({directoryId})`
 *    を呼び、Google の同意画面 URL を取得 → 管理者をリダイレクト
 * 2. Google が承認後、本エンドポイントへ ?code=...&state=<directoryId> を返す
 * 3. `getAccessToken` で code → token 交換、`setToken` で Directory に紐付け保存
 * 4. 以降 Jackson が cron で Google Directory API を pull → event-handler へ
 *
 * state にはセッションを跨ぐ Directory ID が必要。
 * Jackson の generateAuthorizationUrl は state に directoryId を埋め込む。
 */
export const GET = async (req: NextRequest) => {
  const ensured = await ensureJackson();
  if (!ensured.ok) return ensured.response;

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: "google_oauth_denied", detail: error },
      { status: 400 },
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "missing_params", detail: "code or state is missing" },
      { status: 400 },
    );
  }

  const directoryId = state;
  const { directorySyncController } = ensured.jackson;

  const tokenRes = await directorySyncController.google.getAccessToken({
    directoryId,
    code,
  });
  if (tokenRes.error || !tokenRes.data) {
    return NextResponse.json(
      {
        error: "token_exchange_failed",
        detail: tokenRes.error?.message ?? "unknown",
      },
      { status: 502 },
    );
  }

  const setRes = await directorySyncController.google.setToken({
    directoryId,
    accessToken: tokenRes.data.access_token,
    refreshToken: tokenRes.data.refresh_token,
  });
  if (setRes.error) {
    return NextResponse.json(
      { error: "token_persist_failed", detail: setRes.error.message },
      { status: 500 },
    );
  }

  // 認可完了後、設定画面に戻す
  return NextResponse.redirect(new URL("/admin/settings", req.nextUrl.origin));
};
