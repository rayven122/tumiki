import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@tumiki/internal-db";
import { auth } from "~/auth";
import {
  ensureJackson,
  redirectToSettingsWithError,
} from "~/server/jackson/route-helpers";

/// Jackson の `directory.google_authorization_url` (= externalUrl + authorizePath) が指す
/// 認可開始エンドポイント。SYSTEM_ADMIN セッションを要求し、対象 Directory の
/// Google OAuth 同意 URL を発行して Google へリダイレクトする。
/// directoryId クエリ未指定時は最新の google Directory を使用（単一 Directory 運用前提）

const TENANT = "default";
const PRODUCT = "internal-manager";

export const GET = async (req: NextRequest) => {
  // CSRF 対策: SYSTEM_ADMIN セッション必須
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SYSTEM_ADMIN) {
    console.warn("[google-authorize] unauthenticated access");
    return redirectToSettingsWithError(req, "unauthorized");
  }

  const ensured = await ensureJackson();
  if (!ensured.ok) return ensured.response;

  const { directorySyncController } = ensured.jackson;
  let directoryId = req.nextUrl.searchParams.get("directoryId") ?? undefined;

  // directoryId 未指定時は最新の google Directory を fallback で使用
  if (!directoryId) {
    const list =
      await directorySyncController.directories.getByTenantAndProduct(
        TENANT,
        PRODUCT,
      );
    if (list.error) {
      console.error("[google-authorize] list failed:", list.error);
      return redirectToSettingsWithError(req, "directory_lookup_failed");
    }
    const target = (list.data ?? []).filter((d) => d.type === "google").at(-1);
    if (!target) {
      return redirectToSettingsWithError(req, "no_google_directory");
    }
    directoryId = target.id;
  }

  const { data, error } =
    await directorySyncController.google.generateAuthorizationUrl({
      directoryId,
    });
  if (error || !data) {
    console.error("[google-authorize] generateAuthorizationUrl failed:", error);
    return redirectToSettingsWithError(req, "authorization_url_failed");
  }

  return NextResponse.redirect(data.authorizationUrl);
};
