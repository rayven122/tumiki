import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { getSessionInfo } from "~/lib/auth/session-utils";

/**
 * サインイン Route Handler
 * 直接Keycloakのログイン画面にリダイレクト
 */
export const GET = async (request: NextRequest) => {
  const session = await auth();
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const orgSlug = getSessionInfo(session).organizationSlug;

  // callbackUrlのバリデーション（サインインループを防ぐ）
  const disallowedCallbackPaths = ["/signin", "/signup", "/api/auth/"];
  const validatedCallbackUrl =
    callbackUrl &&
    !disallowedCallbackPaths.some((path) => callbackUrl.startsWith(path))
      ? callbackUrl
      : null;

  // リダイレクト先の優先順位:
  // 1. 招待リンク（最優先）
  // 2. デフォルト組織ページ
  // 3. その他の callbackUrl
  // 4. 初回ユーザー（org_slug なし）
  let redirectUrl: string;
  if (validatedCallbackUrl?.startsWith("/invite/")) {
    redirectUrl = validatedCallbackUrl;
  } else if (orgSlug) {
    redirectUrl = `/${orgSlug}/mcps`;
  } else if (validatedCallbackUrl) {
    redirectUrl = validatedCallbackUrl;
  } else {
    redirectUrl = "/onboarding";
  }

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  // Keycloakのログイン画面にリダイレクト
  await signIn("keycloak", { redirectTo: redirectUrl });
};
