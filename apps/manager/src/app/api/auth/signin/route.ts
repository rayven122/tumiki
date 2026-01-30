import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { determineRedirectUrl } from "~/lib/auth/redirect-utils";
import { getSessionInfo } from "~/lib/auth/session-utils";

/**
 * サインイン Route Handler
 * 直接Keycloakのログイン画面にリダイレクト
 */
export const GET = async (request: NextRequest) => {
  const session = await auth();
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const orgSlug = getSessionInfo(session).organizationSlug;

  // リダイレクト先を決定
  const redirectUrl = determineRedirectUrl(callbackUrl, orgSlug, false);

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  // Keycloakのログイン画面にリダイレクト
  await signIn("keycloak", { redirectTo: redirectUrl });
};
