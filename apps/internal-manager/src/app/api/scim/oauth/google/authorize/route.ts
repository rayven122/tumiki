import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@tumiki/internal-db";
import { auth } from "~/auth";
import { ensureJackson } from "~/server/jackson/route-helpers";

/**
 * Google Workspace Directory Sync OAuth 認可開始エンドポイント
 *
 * Jackson の `directory.google_authorization_url` は
 * `${externalUrl}${dsync.providers.google.authorizePath}` 固定で発行され、
 * directoryId クエリは含まれない。本ハンドラはセッション付き管理者リクエストを
 * 受け、対象 Directory に対する Google OAuth 同意 URL を発行して Google へ
 * リダイレクトする。
 *
 * クエリ:
 *  - directoryId (任意): 対象 Directory の ID。未指定時は最新の google
 *    Directory を使用（単一 Directory 運用前提）
 */

const TENANT = "default";
const PRODUCT = "internal-manager";
const SETTINGS_PATH = "/admin/settings";

const redirectWithError = (req: NextRequest, code: string) =>
  NextResponse.redirect(
    new URL(
      `${SETTINGS_PATH}?scim_error=${encodeURIComponent(code)}`,
      req.nextUrl.origin,
    ),
  );

export const GET = async (req: NextRequest) => {
  // CSRF 対策: SYSTEM_ADMIN セッション必須
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SYSTEM_ADMIN) {
    console.warn("[google-authorize] unauthenticated access");
    return redirectWithError(req, "unauthorized");
  }

  const ensured = await ensureJackson();
  if (!ensured.ok) return ensured.response;

  const { directorySyncController } = ensured.jackson;
  let directoryId = req.nextUrl.searchParams.get("directoryId") ?? undefined;

  // directoryId 未指定時は最新の google Directory を使用
  if (!directoryId) {
    const list =
      await directorySyncController.directories.getByTenantAndProduct(
        TENANT,
        PRODUCT,
      );
    if (list.error) {
      console.error("[google-authorize] list failed:", list.error);
      return redirectWithError(req, "directory_lookup_failed");
    }
    const googleDirs = (list.data ?? []).filter((d) => d.type === "google");
    if (googleDirs.length === 0) {
      return redirectWithError(req, "no_google_directory");
    }
    // 単一 Directory 前提。複数あれば末尾（=最新）を使用
    const target = googleDirs[googleDirs.length - 1];
    if (!target) {
      return redirectWithError(req, "no_google_directory");
    }
    directoryId = target.id;
  }

  const { data, error } =
    await directorySyncController.google.generateAuthorizationUrl({
      directoryId,
    });
  if (error || !data) {
    console.error("[google-authorize] generateAuthorizationUrl failed:", error);
    return redirectWithError(req, "authorization_url_failed");
  }

  return NextResponse.redirect(data.authorizationUrl);
};
