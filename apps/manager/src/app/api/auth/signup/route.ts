import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { determineRedirectUrl } from "~/lib/auth/redirect-utils";
import { getSessionInfo } from "~/lib/auth/session-utils";

/**
 * 新規登録 Route Handler
 * Auth.jsのsignIn経由でKeycloakの新規登録画面にリダイレクト
 * prompt=createを使用することでPKCE/stateを正しく処理する
 */
export const GET = async (request: NextRequest) => {
  const session = await auth();
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const orgSlug = getSessionInfo(session).organizationSlug;

  // リダイレクト先を決定（新規ユーザーフラグをtrue）
  const redirectUrl = determineRedirectUrl(callbackUrl, orgSlug, true);

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  // Auth.jsのsignIn経由でKeycloakにリダイレクト
  // prompt=createでKeycloakの新規登録画面を表示
  await signIn("keycloak", { redirectTo: redirectUrl }, { prompt: "create" });
};
