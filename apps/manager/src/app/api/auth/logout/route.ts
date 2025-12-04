import { auth, signOut } from "~/auth";
import { db } from "@tumiki/db/server";
import { logoutKeycloakUser } from "~/lib/keycloak-admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 統合ログアウトAPI
 *
 * KeycloakとAuth.jsの両方からログアウトして、ルートページにリダイレクトします。
 * エラーが発生してもAuth.jsセッションは必ず削除されます。
 */
export const GET = async (request: NextRequest) => {
  const session = await auth();

  // Keycloakセッション削除を試みる（エラーは無視）
  if (session?.user?.id) {
    const account = await db.account.findFirst({
      where: { userId: session.user.id, provider: "keycloak" },
      select: { providerAccountId: true },
    });

    if (account?.providerAccountId) {
      await logoutKeycloakUser(account.providerAccountId);
    }
  }

  // Auth.jsセッションを削除
  await signOut({ redirect: false });

  // ベースURLを取得（originまたはrefererヘッダーから取得）
  const baseUrl =
    request.headers.get("origin") ??
    request.headers.get("referer")?.split("/").slice(0, 3).join("/") ??
    "https://www.tumiki.cloud";

  // ルートページにリダイレクト
  return NextResponse.redirect(new URL("/", baseUrl));
};
