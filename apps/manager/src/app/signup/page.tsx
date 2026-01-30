import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { getKeycloakEnv } from "~/utils/env";

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/**
 * 新規登録ページ
 * 直接Keycloakの新規登録画面にリダイレクト
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const orgSlug = getSessionInfo(session).organizationSlug;

  // callbackUrlのバリデーション
  const disallowedCallbackPaths = ["/signin", "/signup", "/api/auth/"];
  const validatedCallbackUrl =
    callbackUrl &&
    !disallowedCallbackPaths.some((path) => callbackUrl.startsWith(path))
      ? callbackUrl
      : null;

  // リダイレクト先の決定
  let redirectUrl: string;
  if (validatedCallbackUrl?.startsWith("/invite/")) {
    redirectUrl = validatedCallbackUrl;
  } else if (orgSlug) {
    redirectUrl = `/${orgSlug}/mcps`;
  } else if (validatedCallbackUrl) {
    redirectUrl = validatedCallbackUrl;
  } else {
    redirectUrl = "/onboarding?first=true";
  }

  // 既にログイン済みの場合は、リダイレクト先へ
  if (session?.user) {
    redirect(redirectUrl);
  }

  // Keycloakの新規登録URLを構築
  const keycloakEnv = getKeycloakEnv();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const callbackUrlEncoded = encodeURIComponent(
    `${baseUrl}/api/auth/callback/keycloak`,
  );

  // state パラメータにリダイレクト先を含める
  const registrationUrl = new URL(
    `${keycloakEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
  );
  registrationUrl.searchParams.set("client_id", keycloakEnv.KEYCLOAK_CLIENT_ID);
  registrationUrl.searchParams.set("response_type", "code");
  registrationUrl.searchParams.set("redirect_uri", callbackUrlEncoded);
  registrationUrl.searchParams.set("scope", "openid");

  redirect(registrationUrl.toString());
}
