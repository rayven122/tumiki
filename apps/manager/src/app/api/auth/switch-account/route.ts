import { auth, signIn, signOut } from "~/auth";
import { logoutKeycloakUser } from "~/lib/keycloak-admin";
import type { NextRequest } from "next/server";

/**
 * アカウント切り替えAPI
 *
 * KeycloakとAuth.jsの両方からログアウトして、
 * Keycloakログイン画面（Googleアカウント選択）にリダイレクトします。
 */
export const GET = async (request: NextRequest) => {
  const session = await auth();
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/";

  // Keycloakセッション削除を試みる（エラーは無視）
  // session.user.id は Keycloak の providerAccountId と同一
  if (session?.user?.id) {
    await logoutKeycloakUser(session.user.id);
  }

  // Auth.jsセッションを削除
  await signOut({ redirect: false });

  // Keycloakでサインイン（Googleアカウント選択画面を表示）
  // auth.ts で prompt: "select_account" が設定済み
  await signIn("keycloak", { redirectTo: callbackUrl });
};
